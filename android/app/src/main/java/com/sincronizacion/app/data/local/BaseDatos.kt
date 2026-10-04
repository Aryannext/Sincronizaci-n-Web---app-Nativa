package com.sincronizacion.app.data.local

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface PersonaDao {

    @Query(
        """
        SELECT p.uuid, p.nombre, p.apellido, p.telefono, p.correo, p.version, p.error, o.tipo AS pendiente
        FROM personas p
        LEFT JOIN operaciones o ON o.uuid = p.uuid
        WHERE p.borradaLocal = 0
        ORDER BY p.nombre COLLATE NOCASE, p.apellido COLLATE NOCASE
        """
    )
    fun observarVisibles(): Flow<List<PersonaConPendiente>>

    @Query("SELECT * FROM personas WHERE uuid = :uuid")
    suspend fun buscar(uuid: String): PersonaEntity?

    @Upsert
    suspend fun guardar(persona: PersonaEntity)

    @Query("DELETE FROM personas WHERE uuid = :uuid")
    suspend fun borrar(uuid: String)

    @Query("DELETE FROM personas")
    suspend fun borrarTodas()
}

@Dao
interface OperacionDao {

    @Query("SELECT * FROM operaciones WHERE uuid = :uuid")
    suspend fun buscarPorUuid(uuid: String): OperacionEntity?

    @Query("SELECT * FROM operaciones WHERE id = :id")
    suspend fun buscarPorId(id: Long): OperacionEntity?

    /** Las más antiguas primero: el servidor las aplica en el orden recibido. */
    @Query("SELECT * FROM operaciones ORDER BY id LIMIT :limite")
    suspend fun siguientes(limite: Int): List<OperacionEntity>

    @Query("SELECT COUNT(*) FROM operaciones")
    fun observarCantidad(): Flow<Int>

    @Query("SELECT COUNT(*) FROM operaciones")
    suspend fun cantidad(): Int

    @Upsert
    suspend fun guardar(operacion: OperacionEntity)

    @Query("DELETE FROM operaciones WHERE id = :id")
    suspend fun borrar(id: Long)

    @Query("DELETE FROM operaciones WHERE uuid = :uuid")
    suspend fun borrarPorUuid(uuid: String)

    @Query("DELETE FROM operaciones")
    suspend fun borrarTodas()
}

@Dao
interface EstadoSyncDao {

    @Query("SELECT * FROM estado_sync WHERE id = 1")
    suspend fun obtener(): EstadoSyncEntity?

    @Query("SELECT * FROM estado_sync WHERE id = 1")
    fun observar(): Flow<EstadoSyncEntity?>

    @Upsert
    suspend fun guardar(estado: EstadoSyncEntity)

    @Query("DELETE FROM estado_sync")
    suspend fun borrar()
}

@Database(
    entities = [PersonaEntity::class, OperacionEntity::class, EstadoSyncEntity::class],
    version = 1,
    exportSchema = true
)
abstract class BaseDatos : RoomDatabase() {

    abstract fun personas(): PersonaDao
    abstract fun operaciones(): OperacionDao
    abstract fun estadoSync(): EstadoSyncDao

    companion object {
        fun crear(contexto: Context): BaseDatos =
            Room.databaseBuilder(contexto, BaseDatos::class.java, "syncpulse.db").build()
    }
}
