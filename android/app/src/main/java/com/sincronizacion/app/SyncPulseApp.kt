package com.sincronizacion.app

import android.app.Application
import android.content.Context
import com.sincronizacion.app.data.AuthRepositorio
import com.sincronizacion.app.data.PersonasRepositorio
import com.sincronizacion.app.data.Sincronizador
import com.sincronizacion.app.data.local.BaseDatos
import com.sincronizacion.app.data.remote.ApiService
import com.sincronizacion.app.data.sesion.AlmacenSesion
import com.sincronizacion.app.sync.ProgramadorSync
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async

class SyncPulseApp : Application() {

    lateinit var contenedor: Contenedor
        private set

    override fun onCreate() {
        super.onCreate()
        contenedor = Contenedor(this)
        contenedor.programador.programarPeriodica()
    }
}

/** Dependencias de la app, creadas una sola vez. */
class Contenedor(contexto: Context) {

    private val alcance = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    val db = BaseDatos.crear(contexto)
    val sesion = AlmacenSesion(contexto)
    val programador = ProgramadorSync(contexto)
    private val api = ApiService.crear { sesion.token }

    val auth = AuthRepositorio(api, sesion)
    val personas = PersonasRepositorio(db) { programador.sincronizarAhora() }
    val sincronizador = Sincronizador(db, api, sesion)

    /** Carga la sesión guardada; la interfaz y el worker esperan a que termine. */
    val inicializada: Deferred<Unit> = alcance.async { sesion.cargar() }
}
