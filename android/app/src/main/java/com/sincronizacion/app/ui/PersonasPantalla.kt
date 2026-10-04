package com.sincronizacion.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.sincronizacion.app.data.AuthRepositorio
import com.sincronizacion.app.data.PersonasRepositorio
import com.sincronizacion.app.data.local.EstadoSyncDao
import com.sincronizacion.app.data.local.PersonaConPendiente
import com.sincronizacion.app.sync.ProgramadorSync
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.DateFormat
import java.util.Date

data class EstadoPersonas(
    val personas: List<PersonaConPendiente> = emptyList(),
    val pendientes: Int = 0,
    val sincronizando: Boolean = false,
    val ultimaSync: Long? = null,
    val aviso: String? = null
)

class PersonasViewModel(
    private val repositorio: PersonasRepositorio,
    private val programador: ProgramadorSync,
    private val auth: AuthRepositorio,
    estadoSync: EstadoSyncDao
) : ViewModel() {

    val estado: StateFlow<EstadoPersonas> = combine(
        repositorio.personas,
        repositorio.cambiosPendientes,
        programador.sincronizando,
        estadoSync.observar()
    ) { personas, pendientes, sincronizando, sync ->
        EstadoPersonas(personas, pendientes, sincronizando, sync?.ultimaSync, sync?.ultimoAviso)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), EstadoPersonas())

    fun sincronizar() = programador.sincronizarAhora()

    fun borrar(uuid: String) {
        viewModelScope.launch { repositorio.borrar(uuid) }
    }

    fun cerrarSesion() {
        viewModelScope.launch { auth.cerrarSesion() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PersonasPantalla(
    vm: PersonasViewModel,
    nombreUsuario: String,
    alNueva: () -> Unit,
    alEditar: (String) -> Unit
) {
    val estado by vm.estado.collectAsStateWithLifecycle()
    var aBorrar by remember { mutableStateOf<PersonaConPendiente?>(null) }
    var confirmarSalida by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Personas")
                        Text(nombreUsuario, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                actions = {
                    if (estado.sincronizando) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        IconButton(onClick = vm::sincronizar) { Icon(Icons.Default.Refresh, "Sincronizar ahora") }
                    }
                    IconButton(onClick = { confirmarSalida = true }) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, "Cerrar sesión")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = alNueva) { Icon(Icons.Default.Add, "Nueva persona") }
        }
    ) { relleno ->
        Column(modifier = Modifier.padding(relleno).fillMaxSize()) {
            BarraEstado(estado)
            if (estado.personas.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No hay personas. Pulsa + para crear una.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(16.dp)
                ) {
                    items(estado.personas, key = { it.uuid }) { persona ->
                        TarjetaPersona(persona, alPulsar = { alEditar(persona.uuid) }, alBorrar = { aBorrar = persona })
                    }
                }
            }
        }
    }

    aBorrar?.let { persona ->
        AlertDialog(
            onDismissRequest = { aBorrar = null },
            title = { Text("¿Borrar a ${persona.nombre} ${persona.apellido}?") },
            text = { Text("Se borrará también en el servidor al sincronizar. Un administrador puede restaurarla desde la papelera del panel web.") },
            confirmButton = {
                TextButton(onClick = { vm.borrar(persona.uuid); aBorrar = null }) { Text("Borrar") }
            },
            dismissButton = { TextButton(onClick = { aBorrar = null }) { Text("Cancelar") } }
        )
    }

    if (confirmarSalida) {
        AlertDialog(
            onDismissRequest = { confirmarSalida = false },
            title = { Text("¿Cerrar sesión?") },
            text = {
                Text(
                    if (estado.pendientes > 0) "Tienes ${estado.pendientes} cambio(s) sin subir. Se conservarán en el teléfono y se subirán cuando vuelvas a iniciar sesión."
                    else "Tendrás que volver a iniciar sesión para sincronizar."
                )
            },
            confirmButton = { TextButton(onClick = { confirmarSalida = false; vm.cerrarSesion() }) { Text("Cerrar sesión") } },
            dismissButton = { TextButton(onClick = { confirmarSalida = false }) { Text("Cancelar") } }
        )
    }
}

@Composable
private fun BarraEstado(estado: EstadoPersonas) {
    val formato = remember { DateFormat.getTimeInstance(DateFormat.SHORT) }
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        val resumen = buildString {
            append(if (estado.pendientes == 0) "Todo sincronizado" else "${estado.pendientes} cambio(s) pendiente(s) de subir")
            estado.ultimaSync?.let { append(" · última sincronización ${formato.format(Date(it))}") }
        }
        Text(resumen, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        estado.aviso?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.tertiary)
        }
    }
}

@Composable
private fun TarjetaPersona(persona: PersonaConPendiente, alPulsar: () -> Unit, alBorrar: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable(onClick = alPulsar)) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("${persona.nombre} ${persona.apellido}", style = MaterialTheme.typography.titleMedium)
                Text(persona.correo, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(persona.telefono, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                EtiquetaEstado(persona)
            }
            IconButton(onClick = alBorrar) { Icon(Icons.Default.Delete, "Borrar") }
        }
    }
}

@Composable
private fun EtiquetaEstado(persona: PersonaConPendiente) {
    val (texto, color) = when {
        persona.error != null -> "Rechazado: ${persona.error}" to MaterialTheme.colorScheme.error
        persona.pendiente == "CREATE" -> "Nuevo, pendiente de subir" to MaterialTheme.colorScheme.tertiary
        persona.pendiente == "UPDATE" -> "Editado, pendiente de subir" to MaterialTheme.colorScheme.tertiary
        else -> "Sincronizado · v${persona.version}" to Color(0xFF34D399)
    }
    Text(texto, style = MaterialTheme.typography.labelSmall, color = color)
}
