package com.sincronizacion.app.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "personas")
data class PersonaEntity(
    @PrimaryKey val uuid: String,
    /** id del servidor; null hasta que el registro se sube por primera vez. */
    val idServidor: Int?,
    val nombre: String,
    val apellido: String,
    val telefono: String,
    val correo: String,
    /** Última versión conocida del servidor; 0 si nunca se sincronizó. */
    val version: Int,
    /** Borrada en el móvil, a la espera de que el servidor confirme el borrado. */
    val borradaLocal: Boolean = false,
    /** Motivo del último rechazo del servidor, para que el usuario lo corrija. */
    val error: String? = null,
    val actualizadaEn: Long = System.currentTimeMillis()
)

/** Cambio pendiente de subir. Como máximo uno por registro (índice único en uuid). */
@Entity(tableName = "operaciones", indices = [Index(value = ["uuid"], unique = true)])
data class OperacionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val uuid: String,
    /** CREATE, UPDATE o DELETE. */
    val tipo: String,
    val baseVersion: Int?,
    /** Sube cada vez que la operación cambia, para detectar ediciones durante un envío. */
    val revision: Int = 0,
    val creadaEn: Long = System.currentTimeMillis()
)

/** Fila única con el progreso de la sincronización. */
@Entity(tableName = "estado_sync")
data class EstadoSyncEntity(
    @PrimaryKey val id: Int = 1,
    /** Último change_id descargado de GET /api/sync. */
    val lastChangeId: Long = 0,
    val ultimaSync: Long? = null,
    /** Resumen de la última sincronización (conflictos, rechazos o error), o null si fue limpia. */
    val ultimoAviso: String? = null
)

/** Persona con su operación pendiente, si la hay, para pintar la lista. */
data class PersonaConPendiente(
    val uuid: String,
    val nombre: String,
    val apellido: String,
    val telefono: String,
    val correo: String,
    val version: Int,
    val error: String?,
    val pendiente: String?
)
