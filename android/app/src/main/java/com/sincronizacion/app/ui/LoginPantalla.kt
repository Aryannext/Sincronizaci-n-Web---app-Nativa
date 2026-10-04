package com.sincronizacion.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sincronizacion.app.BuildConfig
import com.sincronizacion.app.data.AuthRepositorio
import com.sincronizacion.app.sync.ProgramadorSync
import kotlinx.coroutines.launch

class LoginViewModel(
    private val auth: AuthRepositorio,
    private val programador: ProgramadorSync
) : ViewModel() {

    var correo by mutableStateOf("")
    var password by mutableStateOf("")
    var cargando by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun entrar() {
        if (cargando) return
        cargando = true
        error = null
        viewModelScope.launch {
            error = auth.iniciarSesion(correo, password)
            cargando = false
            if (error == null) {
                password = ""
                // Sube lo que quedó pendiente (por ejemplo, tras una sesión caducada)
                programador.sincronizarAhora()
            }
        }
    }
}

@Composable
fun LoginPantalla(vm: LoginViewModel, aviso: String?) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)
    ) {
        Text("SyncPulse Móvil", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Inicia sesión con tu usuario operador.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        val mensaje = vm.error ?: aviso
        if (mensaje != null) {
            Text(mensaje, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }

        OutlinedTextField(
            value = vm.correo,
            onValueChange = { vm.correo = it },
            label = { Text("Correo") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = vm.password,
            onValueChange = { vm.password = it },
            label = { Text("Contraseña") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            modifier = Modifier.fillMaxWidth()
        )
        Button(
            onClick = vm::entrar,
            enabled = !vm.cargando && vm.correo.isNotBlank() && vm.password.isNotEmpty(),
            modifier = Modifier.fillMaxWidth()
        ) {
            if (vm.cargando) CircularProgressIndicator(modifier = Modifier.padding(2.dp), strokeWidth = 2.dp)
            else Text("Iniciar sesión")
        }
        Text(
            "Servidor: ${BuildConfig.API_URL}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
