package com.sincronizacion.app.data

import com.sincronizacion.app.BuildConfig
import com.sincronizacion.app.data.remote.ApiService
import com.sincronizacion.app.data.remote.ErrorApiDto
import com.sincronizacion.app.data.remote.LoginRequest
import com.sincronizacion.app.data.sesion.AlmacenSesion
import retrofit2.HttpException
import java.io.IOException

class AuthRepositorio(
    private val api: ApiService,
    private val sesion: AlmacenSesion
) {

    /** Devuelve null si entró, o el mensaje de error para mostrar. */
    suspend fun iniciarSesion(correo: String, password: String): String? = try {
        val respuesta = api.login(LoginRequest(correo.trim(), password))
        sesion.guardar(respuesta.token, respuesta.usuario.nombre, respuesta.usuario.correo)
        null
    } catch (error: HttpException) {
        // El servidor explica el motivo: credenciales incorrectas, demasiados intentos...
        mensajeDelServidor(error) ?: "No se pudo iniciar sesión (error ${error.code()})."
    } catch (error: IOException) {
        "No se pudo conectar con el servidor (${BuildConfig.API_URL}). Revisa que el PC y el teléfono estén en la misma red Wi-Fi."
    }

    suspend fun cerrarSesion() = sesion.cerrar()

    private fun mensajeDelServidor(error: HttpException): String? = runCatching {
        val cuerpo = error.response()?.errorBody()?.string() ?: return null
        val dto = ApiService.json.decodeFromString(ErrorApiDto.serializer(), cuerpo)
        dto.message ?: dto.errors?.firstOrNull()?.mensaje
    }.getOrNull()
}
