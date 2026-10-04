package com.sincronizacion.app.data

import androidx.room.withTransaction
import com.sincronizacion.app.data.local.BaseDatos
import com.sincronizacion.app.data.local.OperacionEntity
import com.sincronizacion.app.data.local.PersonaConPendiente
import com.sincronizacion.app.data.local.PersonaEntity
import com.sincronizacion.app.domain.CambioEnCola
import com.sincronizacion.app.domain.ColaOperaciones
import com.sincronizacion.app.domain.DatosPersona
import com.sincronizacion.app.domain.OperacionEnCola
import com.sincronizacion.app.domain.TipoOperacion
import kotlinx.coroutines.flow.Flow
import java.util.UUID

/**
 * Cambios del usuario: se guardan en Room al momento (funciona sin conexión) y se
 * ponen en la cola de operaciones. alCambiar programa una sincronización.
 */
class PersonasRepositorio(
    private val db: BaseDatos,
    private val alCambiar: () -> Unit
) {

    val personas: Flow<List<PersonaConPendiente>> = db.personas().observarVisibles()

    val cambiosPendientes: Flow<Int> = db.operaciones().observarCantidad()

    suspend fun buscar(uuid: String): PersonaEntity? = db.personas().buscar(uuid)

    suspend fun crear(datos: DatosPersona): String {
        val d = datos.normalizada()
        // El uuid lo genera el móvil y nunca cambia: así el servidor detecta reenvíos
        val uuid = UUID.randomUUID().toString()
        db.withTransaction {
            db.personas().guardar(
                PersonaEntity(uuid, null, d.nombre, d.apellido, d.telefono, d.correo, version = 0)
            )
            encolar(uuid, TipoOperacion.CREATE, versionServidor = 0)
        }
        alCambiar()
        return uuid
    }

    suspend fun editar(uuid: String, datos: DatosPersona) {
        val d = datos.normalizada()
        db.withTransaction {
            val actual = db.personas().buscar(uuid) ?: return@withTransaction
            db.personas().guardar(
                actual.copy(
                    nombre = d.nombre,
                    apellido = d.apellido,
                    telefono = d.telefono,
                    correo = d.correo,
                    error = null,
                    actualizadaEn = System.currentTimeMillis()
                )
            )
            encolar(uuid, TipoOperacion.UPDATE, actual.version)
        }
        alCambiar()
    }

    suspend fun borrar(uuid: String) {
        db.withTransaction {
            val actual = db.personas().buscar(uuid) ?: return@withTransaction
            if (encolar(uuid, TipoOperacion.DELETE, actual.version)) {
                // Se oculta hasta que el servidor confirme el borrado
                db.personas().guardar(actual.copy(borradaLocal = true, error = null))
            }
        }
        alCambiar()
    }

    /** Devuelve false si el registro se descartó (nunca llegó al servidor). */
    private suspend fun encolar(uuid: String, tipo: TipoOperacion, versionServidor: Int): Boolean {
        val operaciones = db.operaciones()
        val pendiente = operaciones.buscarPorUuid(uuid)
        val anterior = pendiente?.let { OperacionEnCola(TipoOperacion.valueOf(it.tipo), it.baseVersion) }

        return when (val cambio = ColaOperaciones.combinar(anterior, tipo, versionServidor)) {
            CambioEnCola.Descartar -> {
                operaciones.borrarPorUuid(uuid)
                db.personas().borrar(uuid)
                false
            }
            is CambioEnCola.Guardar -> {
                operaciones.guardar(
                    (pendiente ?: OperacionEntity(uuid = uuid, tipo = cambio.operacion.tipo.name, baseVersion = null)).copy(
                        tipo = cambio.operacion.tipo.name,
                        baseVersion = cambio.operacion.baseVersion,
                        revision = (pendiente?.revision ?: -1) + 1
                    )
                )
                true
            }
        }
    }
}
