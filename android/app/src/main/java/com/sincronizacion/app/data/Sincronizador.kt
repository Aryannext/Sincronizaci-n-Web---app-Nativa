package com.sincronizacion.app.data

import androidx.room.withTransaction
import com.sincronizacion.app.data.local.BaseDatos
import com.sincronizacion.app.data.local.EstadoSyncEntity
import com.sincronizacion.app.data.local.OperacionEntity
import com.sincronizacion.app.data.local.PersonaEntity
import com.sincronizacion.app.data.remote.ApiService
import com.sincronizacion.app.data.remote.CambioDto
import com.sincronizacion.app.data.remote.DatosPersonaDto
import com.sincronizacion.app.data.remote.OperacionDto
import com.sincronizacion.app.data.remote.PushRequest
import com.sincronizacion.app.data.remote.ResultadoPushDto
import com.sincronizacion.app.data.sesion.AlmacenSesion
import com.sincronizacion.app.domain.AccionLocal
import com.sincronizacion.app.domain.EstadoPush
import com.sincronizacion.app.domain.RegistroServidor
import com.sincronizacion.app.domain.ResultadosSync
import com.sincronizacion.app.domain.TipoOperacion
import retrofit2.HttpException
import java.io.IOException

sealed interface ResultadoSync {
    data object Correcto : ResultadoSync
    data object SinSesion : ResultadoSync

    /** El servidor rechazó el token: hay que iniciar sesión de nuevo. La cola se conserva. */
    data object SesionExpirada : ResultadoSync

    /** Sin conexión o el servidor falló: se reintenta más tarde. */
    data class Reintentar(val motivo: String) : ResultadoSync
}

/**
 * Sincronización en dos fases (ver docs/documento.md):
 * 1. PUSH: sube la cola a POST /sync/push y aplica cada resultado.
 * 2. PULL: baja GET /sync desde el último change_id y actualiza Room.
 */
class Sincronizador(
    private val db: BaseDatos,
    private val api: ApiService,
    private val sesion: AlmacenSesion
) {

    private var conflictos = 0
    private var rechazos = 0

    suspend fun sincronizar(): ResultadoSync {
        if (sesion.token == null) return ResultadoSync.SinSesion
        conflictos = 0
        rechazos = 0
        return try {
            subir()
            bajar()
            guardarResumen()
            ResultadoSync.Correcto
        } catch (error: HttpException) {
            if (error.code() == 401) {
                sesion.expirar()
                ResultadoSync.SesionExpirada
            } else {
                ResultadoSync.Reintentar("El servidor respondió ${error.code()}.")
            }
        } catch (error: IOException) {
            ResultadoSync.Reintentar("Sin conexión con el servidor.")
        }
    }

    // ---------- PUSH ----------

    private suspend fun subir() {
        // Si el usuario edita durante un envío, su operación sigue en cola y se sube en la siguiente vuelta
        repeat(MAX_VUELTAS_PUSH) {
            val lote = db.operaciones().siguientes(ApiService.MAX_OPERACIONES_PUSH)
            if (lote.isEmpty()) return

            val enviadas = lote.mapNotNull { operacion -> armar(operacion)?.let { operacion to it } }
            if (enviadas.isEmpty()) return

            val respuesta = api.push(PushRequest(enviadas.map { it.second }))
            for (resultado in respuesta.results) {
                val (operacion, _) = enviadas.getOrNull(resultado.index) ?: continue
                aplicarResultado(operacion, resultado)
            }
        }
    }

    /** Arma la operación con los datos actuales del registro (la cola guarda solo tipo y versión). */
    private suspend fun armar(operacion: OperacionEntity): OperacionDto? {
        val tipo = TipoOperacion.valueOf(operacion.tipo)
        if (tipo == TipoOperacion.DELETE) {
            return OperacionDto(op = tipo.name, uuid = operacion.uuid, baseVersion = operacion.baseVersion)
        }
        val persona = db.personas().buscar(operacion.uuid)
        if (persona == null) {
            db.operaciones().borrar(operacion.id)
            return null
        }
        return OperacionDto(
            op = tipo.name,
            uuid = operacion.uuid,
            baseVersion = operacion.baseVersion,
            data = DatosPersonaDto(persona.nombre, persona.apellido, persona.telefono, persona.correo)
        )
    }

    private suspend fun aplicarResultado(enviada: OperacionEntity, resultado: ResultadoPushDto) = db.withTransaction {
        val operaciones = db.operaciones()
        val personas = db.personas()
        val tipo = TipoOperacion.valueOf(enviada.tipo)
        val actual = operaciones.buscarPorId(enviada.id)
        // ¿El usuario volvió a cambiar el registro mientras se enviaba?
        val modificada = actual != null && actual.revision != enviada.revision

        val accion = ResultadosSync.decidir(
            tipo,
            EstadoPush.desde(resultado.status),
            resultado.record?.aRegistro(),
            resultado.server?.aRegistro(),
            resultado.motivo()
        )

        when (accion) {
            is AccionLocal.Confirmar -> {
                val registro = accion.registro
                when {
                    registro.eliminado -> {
                        personas.borrar(enviada.uuid)
                        operaciones.borrarPorUuid(enviada.uuid)
                    }
                    modificada && actual != null -> {
                        // Se conserva la edición nueva y se sube después sobre la versión confirmada
                        personas.buscar(enviada.uuid)?.let {
                            personas.guardar(it.copy(idServidor = registro.id, version = registro.version, error = null))
                        }
                        val siguienteTipo = if (actual.tipo == TipoOperacion.CREATE.name) TipoOperacion.UPDATE.name else actual.tipo
                        operaciones.guardar(actual.copy(tipo = siguienteTipo, baseVersion = registro.version))
                    }
                    else -> {
                        personas.guardar(registro.aEntidad())
                        operaciones.borrar(enviada.id)
                    }
                }
            }
            is AccionLocal.AceptarServidor -> {
                // Política acordada: ante un conflicto gana la versión del servidor
                conflictos++
                if (accion.registro.eliminado) personas.borrar(enviada.uuid)
                else personas.guardar(accion.registro.aEntidad())
                operaciones.borrarPorUuid(enviada.uuid)
            }
            is AccionLocal.MarcarError -> {
                rechazos++
                if (!modificada) {
                    operaciones.borrar(enviada.id)
                    personas.buscar(enviada.uuid)?.let {
                        // Un borrado rechazado vuelve a mostrarse
                        personas.guardar(it.copy(error = accion.mensaje, borradaLocal = false))
                    }
                }
            }
            AccionLocal.BorrarLocal -> {
                personas.borrar(enviada.uuid)
                operaciones.borrarPorUuid(enviada.uuid)
            }
        }
    }

    // ---------- PULL ----------

    private suspend fun bajar() {
        var desde = db.estadoSync().obtener()?.lastChangeId ?: 0L
        while (true) {
            val pagina = api.cambios(desde, ApiService.TAM_PAGINA_PULL)
            db.withTransaction {
                pagina.changes.forEach { aplicarCambioRemoto(it) }
                val estado = db.estadoSync().obtener() ?: EstadoSyncEntity()
                db.estadoSync().guardar(estado.copy(lastChangeId = pagina.lastChangeId))
            }
            desde = pagina.lastChangeId
            if (pagina.changes.size < ApiService.TAM_PAGINA_PULL) break
        }
    }

    /** data es el estado actual del registro en el servidor: aplicarlo varias veces es seguro. */
    private suspend fun aplicarCambioRemoto(cambio: CambioDto) {
        val datos = cambio.data ?: return
        val version = datos.version ?: return
        val uuid = datos.uuid ?: cambio.recordUuid
        val local = db.personas().buscar(uuid)
        val tienePendiente = db.operaciones().buscarPorUuid(uuid) != null

        if (!ResultadosSync.debeAplicarCambioRemoto(local?.version, tienePendiente, version)) return

        if (datos.deletedAt != null) {
            db.personas().borrar(uuid)
            return
        }
        db.personas().guardar(
            PersonaEntity(
                uuid = uuid,
                idServidor = local?.idServidor,
                nombre = datos.nombre.orEmpty(),
                apellido = datos.apellido.orEmpty(),
                telefono = datos.telefono.orEmpty(),
                correo = datos.correo.orEmpty(),
                version = version
            )
        )
    }

    private suspend fun guardarResumen() {
        val avisos = buildList {
            if (conflictos > 0) add("$conflictos cambio(s) en conflicto: se conservó la versión del servidor.")
            if (rechazos > 0) add("$rechazos cambio(s) rechazado(s): revisa los registros marcados.")
        }
        val estado = db.estadoSync().obtener() ?: EstadoSyncEntity()
        db.estadoSync().guardar(
            estado.copy(ultimaSync = System.currentTimeMillis(), ultimoAviso = avisos.joinToString(" ").ifEmpty { null })
        )
    }

    private fun RegistroServidor.aEntidad() =
        PersonaEntity(uuid, id, nombre, apellido, telefono, correo, version)

    private companion object {
        const val MAX_VUELTAS_PUSH = 10
    }
}
