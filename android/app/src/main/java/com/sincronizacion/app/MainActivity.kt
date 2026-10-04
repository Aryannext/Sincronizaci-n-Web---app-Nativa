package com.sincronizacion.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sincronizacion.app.ui.FormularioPantalla
import com.sincronizacion.app.ui.FormularioViewModel
import com.sincronizacion.app.ui.LoginPantalla
import com.sincronizacion.app.ui.LoginViewModel
import com.sincronizacion.app.ui.PersonasPantalla
import com.sincronizacion.app.ui.PersonasViewModel
import com.sincronizacion.app.ui.TemaSyncPulse

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val contenedor = (application as SyncPulseApp).contenedor
        setContent {
            TemaSyncPulse {
                Surface(modifier = Modifier.fillMaxSize()) {
                    Aplicacion(contenedor)
                }
            }
        }
    }
}

/** Formulario abierto: "nueva" para crear o el uuid de la persona que se edita. */
private const val NUEVA = "nueva"

@Composable
private fun Aplicacion(contenedor: Contenedor) {
    var cargada by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        contenedor.inicializada.await()
        cargada = true
    }
    if (!cargada) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }

    val sesion by contenedor.sesion.sesion.collectAsStateWithLifecycle()
    val aviso by contenedor.sesion.aviso.collectAsStateWithLifecycle()

    val actual = sesion
    if (actual == null) {
        val vm = viewModel { LoginViewModel(contenedor.auth, contenedor.programador) }
        LoginPantalla(vm, aviso)
        return
    }

    var formulario by rememberSaveable { mutableStateOf<String?>(null) }
    // Cada apertura del formulario usa un ViewModel nuevo, con los datos actuales
    var aperturas by rememberSaveable { mutableStateOf(0) }
    val abrir: (String) -> Unit = { formulario = it; aperturas++ }

    when (val abierto = formulario) {
        null -> {
            val vm = viewModel {
                PersonasViewModel(contenedor.personas, contenedor.programador, contenedor.auth, contenedor.db.estadoSync())
            }
            PersonasPantalla(
                vm = vm,
                nombreUsuario = actual.nombre,
                alNueva = { abrir(NUEVA) },
                alEditar = abrir
            )
        }
        else -> {
            BackHandler { formulario = null }
            val uuid = abierto.takeIf { it != NUEVA }
            val vm = viewModel(key = "formulario-$aperturas") { FormularioViewModel(contenedor.personas, uuid) }
            FormularioPantalla(vm, alVolver = { formulario = null })
        }
    }
}
