package com.sincronizacion.app.domain

/** Estados que devuelve POST /api/sync/push por cada operación (ver docs/api.md). */
enum class EstadoPush {
    APPLIED, DUPLICATE, CONFLICT, NOT_FOUND, INVALID, REJECTED, DESCONOCIDO;

    companion object {
        fun desde(valor: String): EstadoPush =
            entries.firstOrNull { it.name.equals(valor, ignoreCase = true) } ?: DESCONOCIDO
    }
}

/** Registro tal como lo tiene el servidor. */
data class RegistroServidor(
    val id: Int?,
    val uuid: String,
    val nombre: String,
    val apellido: String,
    val telefono: String,
    val correo: String,
    val version: Int,
    val eliminado: Boolean
)

/** Qué hacer en la base local con el resultado de una operación subida. */
sealed interface AccionLocal {

    /** El servidor aplicó el cambio: se guarda su versión (y se borra en local si quedó eliminado). */
    data class Confirmar(val registro: RegistroServidor) : AccionLocal

    /** Conflicto: alguien cambió el registro antes. Gana la versión del servidor. */
    data class AceptarServidor(val registro: RegistroServidor) : AccionLocal

    /** El servidor rechazó el cambio: se muestra el motivo para que el usuario lo corrija. */
    data class MarcarError(val mensaje: String) : AccionLocal

    /** Se pidió borrar algo que el servidor ya no tiene: basta con borrarlo en local. */
    data object BorrarLocal : AccionLocal
}

object ResultadosSync {

    fun decidir(
        tipo: TipoOperacion,
        estado: EstadoPush,
        registro: RegistroServidor?,
        servidor: RegistroServidor?,
        mensaje: String?
    ): AccionLocal = when (estado) {
        EstadoPush.APPLIED, EstadoPush.DUPLICATE ->
            registro?.let { AccionLocal.Confirmar(it) }
                ?: AccionLocal.MarcarError("El servidor no devolvió el registro.")
        EstadoPush.CONFLICT ->
            servidor?.let { AccionLocal.AceptarServidor(it) }
                ?: AccionLocal.MarcarError("Conflicto sin la versión del servidor.")
        EstadoPush.NOT_FOUND ->
            if (tipo == TipoOperacion.DELETE) AccionLocal.BorrarLocal
            else AccionLocal.MarcarError("El servidor ya no tiene este registro.")
        EstadoPush.INVALID, EstadoPush.REJECTED ->
            AccionLocal.MarcarError(mensaje ?: "El servidor rechazó el cambio.")
        EstadoPush.DESCONOCIDO ->
            AccionLocal.MarcarError("Respuesta inesperada del servidor.")
    }

    /**
     * Pull: un cambio remoto se aplica solo si el registro no tiene cambios locales
     * pendientes (esos los resuelve el push) y trae una versión más nueva.
     */
    fun debeAplicarCambioRemoto(versionLocal: Int?, tienePendiente: Boolean, versionRemota: Int): Boolean =
        !tienePendiente && (versionLocal == null || versionRemota > versionLocal)
}
