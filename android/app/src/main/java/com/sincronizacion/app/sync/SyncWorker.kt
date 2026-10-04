package com.sincronizacion.app.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.sincronizacion.app.SyncPulseApp
import com.sincronizacion.app.data.ResultadoSync
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.concurrent.TimeUnit

/** WorkManager lo ejecuta cuando hay red, aunque la app esté cerrada. */
class SyncWorker(contexto: Context, parametros: WorkerParameters) : CoroutineWorker(contexto, parametros) {

    override suspend fun doWork(): Result {
        val contenedor = (applicationContext as SyncPulseApp).contenedor
        contenedor.inicializada.await()
        return when (contenedor.sincronizador.sincronizar()) {
            ResultadoSync.Correcto, ResultadoSync.SinSesion -> Result.success()
            // No se reintenta: hace falta que el usuario inicie sesión
            ResultadoSync.SesionExpirada -> Result.failure()
            is ResultadoSync.Reintentar -> Result.retry()
        }
    }
}

class ProgramadorSync(contexto: Context) {

    private val workManager = WorkManager.getInstance(contexto)

    private val conRed = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    /** Tras cada cambio local: se ejecuta en cuanto haya red, y se encadena si ya hay una en curso. */
    fun sincronizarAhora() {
        val trabajo = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(conRed)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        workManager.enqueueUniqueWork(TRABAJO_INMEDIATO, ExistingWorkPolicy.APPEND_OR_REPLACE, trabajo)
    }

    /** Cada 15 minutos (el mínimo de Android) baja los cambios de otros usuarios. */
    fun programarPeriodica() {
        val trabajo = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(conRed)
            .build()
        workManager.enqueueUniquePeriodicWork(TRABAJO_PERIODICO, ExistingPeriodicWorkPolicy.KEEP, trabajo)
    }

    val sincronizando: Flow<Boolean> = workManager.getWorkInfosForUniqueWorkFlow(TRABAJO_INMEDIATO)
        .map { trabajos -> trabajos.any { it.state == WorkInfo.State.RUNNING } }

    private companion object {
        const val TRABAJO_INMEDIATO = "sync-inmediata"
        const val TRABAJO_PERIODICO = "sync-periodica"
    }
}
