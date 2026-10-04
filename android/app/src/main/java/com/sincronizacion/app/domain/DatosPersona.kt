package com.sincronizacion.app.domain

/** Datos editables de una persona, con las mismas reglas que valida el servidor. */
data class DatosPersona(
    val nombre: String,
    val apellido: String,
    val telefono: String,
    val correo: String
) {

    /** Copia lista para guardar: sin espacios sobrantes y el correo en minúsculas (igual que el servidor). */
    fun normalizada() = DatosPersona(
        nombre = nombre.trim(),
        apellido = apellido.trim(),
        telefono = telefono.trim(),
        correo = correo.trim().lowercase()
    )

    /** Errores por campo; vacío si los datos son válidos. */
    fun validar(): Map<String, String> {
        val d = normalizada()
        val errores = mutableMapOf<String, String>()
        if (d.nombre.length !in 2..100) errores["nombre"] = "El nombre debe tener entre 2 y 100 caracteres."
        if (d.apellido.length !in 2..100) errores["apellido"] = "El apellido debe tener entre 2 y 100 caracteres."
        if (d.telefono.length !in 7..20) errores["telefono"] = "El teléfono debe tener entre 7 y 20 caracteres."
        if (!esCorreoValido(d.correo)) errores["correo"] = "El correo no es válido."
        return errores
    }

    private fun esCorreoValido(correo: String): Boolean {
        val partes = correo.split("@")
        if (partes.size != 2 || correo.any { it.isWhitespace() }) return false
        val (usuario, dominio) = partes
        return usuario.isNotEmpty() && dominio.contains('.') && !dominio.startsWith('.') && !dominio.endsWith('.')
    }
}
