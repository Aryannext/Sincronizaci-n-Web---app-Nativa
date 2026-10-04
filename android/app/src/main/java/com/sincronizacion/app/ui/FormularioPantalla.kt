package com.sincronizacion.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sincronizacion.app.data.PersonasRepositorio
import com.sincronizacion.app.domain.DatosPersona
import kotlinx.coroutines.launch

class FormularioViewModel(
    private val repositorio: PersonasRepositorio,
    private val uuid: String?
) : ViewModel() {

    var datos by mutableStateOf(DatosPersona("", "", "", ""))
    var errores by mutableStateOf<Map<String, String>>(emptyMap())
        private set
    /** Motivo del último rechazo del servidor, si lo hubo. */
    var rechazo by mutableStateOf<String?>(null)
        private set
    var guardando by mutableStateOf(false)
        private set

    val esNueva = uuid == null

    init {
        if (uuid != null) {
            viewModelScope.launch {
                repositorio.buscar(uuid)?.let {
                    datos = DatosPersona(it.nombre, it.apellido, it.telefono, it.correo)
                    rechazo = it.error
                }
            }
        }
    }

    fun guardar(alTerminar: () -> Unit) {
        errores = datos.validar()
        if (errores.isNotEmpty() || guardando) return
        guardando = true
        viewModelScope.launch {
            if (uuid == null) repositorio.crear(datos) else repositorio.editar(uuid, datos)
            guardando = false
            alTerminar()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormularioPantalla(vm: FormularioViewModel, alVolver: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (vm.esNueva) "Nueva persona" else "Editar persona") },
                navigationIcon = {
                    IconButton(onClick = alVolver) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver") }
                }
            )
        }
    ) { relleno ->
        Column(
            modifier = Modifier
                .padding(relleno)
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            vm.rechazo?.let {
                Text("El servidor rechazó el último cambio: $it", color = MaterialTheme.colorScheme.error)
            }
            Campo("Nombre", vm.datos.nombre, vm.errores["nombre"]) { vm.datos = vm.datos.copy(nombre = it) }
            Campo("Apellido", vm.datos.apellido, vm.errores["apellido"]) { vm.datos = vm.datos.copy(apellido = it) }
            Campo("Teléfono", vm.datos.telefono, vm.errores["telefono"], KeyboardType.Phone) { vm.datos = vm.datos.copy(telefono = it) }
            Campo("Correo", vm.datos.correo, vm.errores["correo"], KeyboardType.Email) { vm.datos = vm.datos.copy(correo = it) }
            Text(
                "Se guarda en el teléfono al momento y se sube al servidor cuando haya conexión.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Button(
                onClick = { vm.guardar(alVolver) },
                enabled = !vm.guardando,
                modifier = Modifier.fillMaxWidth()
            ) { Text("Guardar") }
        }
    }
}

@Composable
private fun Campo(
    etiqueta: String,
    valor: String,
    error: String?,
    teclado: KeyboardType = KeyboardType.Text,
    alCambiar: (String) -> Unit
) {
    OutlinedTextField(
        value = valor,
        onValueChange = alCambiar,
        label = { Text(etiqueta) },
        singleLine = true,
        isError = error != null,
        supportingText = error?.let { { Text(it) } },
        keyboardOptions = KeyboardOptions(keyboardType = teclado),
        modifier = Modifier.fillMaxWidth()
    )
}
