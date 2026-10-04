package com.sincronizacion.app.data.sesion

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class Sesion(val nombre: String, val correo: String)

private val Context.almacen by preferencesDataStore(name = "sesion")

/**
 * Guarda el token del operador cifrado con una clave del Android Keystore
 * (AES-GCM; la clave no sale del dispositivo). Nunca se guarda la contraseña.
 */
class AlmacenSesion(private val contexto: Context) {

    private val claveToken = stringPreferencesKey("token_cifrado")
    private val claveNombre = stringPreferencesKey("nombre")
    private val claveCorreo = stringPreferencesKey("correo")

    /** Copia en memoria para el interceptor de red, que no puede suspender. */
    @Volatile
    var token: String? = null
        private set

    private val _sesion = MutableStateFlow<Sesion?>(null)
    val sesion: StateFlow<Sesion?> = _sesion.asStateFlow()

    /** Mensaje para la pantalla de login (por ejemplo, sesión caducada). */
    private val _aviso = MutableStateFlow<String?>(null)
    val aviso: StateFlow<String?> = _aviso.asStateFlow()

    suspend fun cargar() {
        val datos = contexto.almacen.data.first()
        val cifrado = datos[claveToken] ?: return
        // Si la clave ya no existe (reinstalación, restauración) la sesión se descarta
        val descifrado = runCatching { CifradorKeystore.descifrar(cifrado) }.getOrNull()
        if (descifrado == null) {
            borrar()
            return
        }
        token = descifrado
        _sesion.value = Sesion(datos[claveNombre].orEmpty(), datos[claveCorreo].orEmpty())
    }

    suspend fun guardar(nuevoToken: String, nombre: String, correo: String) {
        contexto.almacen.edit {
            it[claveToken] = CifradorKeystore.cifrar(nuevoToken)
            it[claveNombre] = nombre
            it[claveCorreo] = correo
        }
        token = nuevoToken
        _aviso.value = null
        _sesion.value = Sesion(nombre, correo)
    }

    /** El servidor rechazó el token (caducado o usuario desactivado). La cola local se conserva. */
    suspend fun expirar() {
        borrar()
        _aviso.value = "Tu sesión expiró. Inicia sesión de nuevo; tus cambios pendientes se conservan."
    }

    suspend fun cerrar() = borrar()

    private suspend fun borrar() {
        contexto.almacen.edit { it.clear() }
        token = null
        _sesion.value = null
    }
}

private object CifradorKeystore {

    private const val ALIAS = "syncpulse_sesion"
    private const val TRANSFORMACION = "AES/GCM/NoPadding"
    private const val TAM_IV = 12

    private fun clave(): SecretKey {
        val keystore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keystore.getEntry(ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }

        val generador = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generador.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generador.generateKey()
    }

    fun cifrar(texto: String): String {
        val cifrador = Cipher.getInstance(TRANSFORMACION).apply { init(Cipher.ENCRYPT_MODE, clave()) }
        val cifrado = cifrador.doFinal(texto.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(cifrador.iv + cifrado, Base64.NO_WRAP)
    }

    fun descifrar(valor: String): String {
        val bytes = Base64.decode(valor, Base64.NO_WRAP)
        val cifrador = Cipher.getInstance(TRANSFORMACION).apply {
            init(Cipher.DECRYPT_MODE, clave(), GCMParameterSpec(128, bytes, 0, TAM_IV))
        }
        return String(cifrador.doFinal(bytes, TAM_IV, bytes.size - TAM_IV), Charsets.UTF_8)
    }
}
