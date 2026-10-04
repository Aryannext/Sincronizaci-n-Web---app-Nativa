package com.sincronizacion.app.data.remote

import com.sincronizacion.app.domain.RegistroServidor
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Modelos JSON de la API. Los nombres coinciden con docs/api.md.

@Serializable
data class LoginRequest(val correo: String, val password: String)

@Serializable
data class LoginResponse(val token: String, val usuario: UsuarioDto)

@Serializable
data class UsuarioDto(
    val id: Int,
    val correo: String,
    val nombre: String,
    val rol: String
)

@Serializable
data class PersonaDto(
    val id: Int? = null,
    val uuid: String,
    val nombre: String,
    val apellido: String,
    val telefono: String,
    val correo: String,
    val version: Int,
    @SerialName("deleted_at") val deletedAt: String? = null
) {
    fun aRegistro() = RegistroServidor(id, uuid, nombre, apellido, telefono, correo, version, deletedAt != null)
}

@Serializable
data class DatosPersonaDto(
    val nombre: String,
    val apellido: String,
    val telefono: String,
    val correo: String
)

@Serializable
data class OperacionDto(
    val op: String,
    val uuid: String,
    @SerialName("base_version") val baseVersion: Int? = null,
    val data: DatosPersonaDto? = null
)

@Serializable
data class PushRequest(val operations: List<OperacionDto>)

@Serializable
data class ErrorCampoDto(val campo: String? = null, val mensaje: String? = null)

@Serializable
data class ResultadoPushDto(
    val index: Int,
    val uuid: String? = null,
    val status: String,
    val record: PersonaDto? = null,
    val server: PersonaDto? = null,
    val errors: List<ErrorCampoDto>? = null,
    val message: String? = null
) {
    /** Motivo legible de un rechazo: el mensaje del servidor o el primer error de validación. */
    fun motivo(): String? = message ?: errors?.firstOrNull()?.mensaje
}

@Serializable
data class PushResponse(val results: List<ResultadoPushDto>)

/** En el pull, data es el estado actual del registro (puede venir vacío si ya no existe). */
@Serializable
data class DatosCambioDto(
    val uuid: String? = null,
    val nombre: String? = null,
    val apellido: String? = null,
    val telefono: String? = null,
    val correo: String? = null,
    val version: Int? = null,
    @SerialName("deleted_at") val deletedAt: String? = null
)

@Serializable
data class CambioDto(
    @SerialName("change_id") val changeId: String,
    @SerialName("record_uuid") val recordUuid: String,
    val operation: String,
    val data: DatosCambioDto? = null
)

@Serializable
data class CambiosResponse(
    @SerialName("last_change_id") val lastChangeId: Long,
    val changes: List<CambioDto>
)

@Serializable
data class ErrorApiDto(val message: String? = null, val errors: List<ErrorCampoDto>? = null)
