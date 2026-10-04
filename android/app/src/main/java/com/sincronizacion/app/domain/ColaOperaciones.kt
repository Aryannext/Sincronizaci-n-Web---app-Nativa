package com.sincronizacion.app.domain

enum class TipoOperacion { CREATE, UPDATE, DELETE }

/** Operación pendiente de subir para un registro. baseVersion es null en CREATE. */
data class OperacionEnCola(val tipo: TipoOperacion, val baseVersion: Int?)

/** Qué hacer con la cola cuando el usuario cambia un registro sin conexión. */
sealed interface CambioEnCola {
    data class Guardar(val operacion: OperacionEnCola) : CambioEnCola

    /** El registro nunca llegó al servidor y se borró: no hay nada que subir. */
    data object Descartar : CambioEnCola
}

/**
 * Cada registro tiene como máximo una operación en cola. Los cambios sucesivos se
 * combinan con la pendiente, así el servidor recibe el estado final y una sola
 * base_version: la última versión del servidor que conocía el móvil.
 */
object ColaOperaciones {

    /**
     * @param pendiente operación ya en cola para ese registro, o null
     * @param nuevo cambio que acaba de hacer el usuario
     * @param versionServidor última versión conocida del servidor (0 si nunca se sincronizó)
     */
    fun combinar(pendiente: OperacionEnCola?, nuevo: TipoOperacion, versionServidor: Int): CambioEnCola {

        val nuncaSincronizado = versionServidor == 0

        if (pendiente == null) {
            return when (nuevo) {
                TipoOperacion.CREATE -> guardar(TipoOperacion.CREATE, null)
                // Si nunca llegó al servidor (por ejemplo, su CREATE fue rechazado), se vuelve a crear
                TipoOperacion.UPDATE ->
                    if (nuncaSincronizado) guardar(TipoOperacion.CREATE, null)
                    else guardar(TipoOperacion.UPDATE, versionServidor)
                TipoOperacion.DELETE ->
                    if (nuncaSincronizado) CambioEnCola.Descartar
                    else guardar(TipoOperacion.DELETE, versionServidor)
            }
        }

        return when (pendiente.tipo) {
            TipoOperacion.CREATE -> when (nuevo) {
                TipoOperacion.DELETE -> CambioEnCola.Descartar
                else -> guardar(TipoOperacion.CREATE, null)
            }
            TipoOperacion.UPDATE -> when (nuevo) {
                TipoOperacion.DELETE -> guardar(TipoOperacion.DELETE, pendiente.baseVersion)
                else -> CambioEnCola.Guardar(pendiente)
            }
            // Un registro borrado ya no se puede editar desde la app
            TipoOperacion.DELETE -> CambioEnCola.Guardar(pendiente)
        }
    }

    private fun guardar(tipo: TipoOperacion, baseVersion: Int?) =
        CambioEnCola.Guardar(OperacionEnCola(tipo, baseVersion))
}
