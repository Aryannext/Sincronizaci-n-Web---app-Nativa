// Crea, actualiza o desactiva usuarios de la API desde la consola.
//
//   npm run crear-usuario -- --correo admin@empresa.com --nombre "Ana Admin" --rol admin
//   npm run crear-usuario -- --correo movil1@empresa.com --nombre "Tablet 1" --rol operador
//   npm run crear-usuario -- --correo movil1@empresa.com --actualizar        (nueva contraseña)
//   npm run crear-usuario -- --correo movil1@empresa.com --desactivar        (revoca el acceso)
//
// La contraseña se pide por teclado sin mostrarse. Para automatizar, puede pasarse en la
// variable de entorno USUARIO_PASSWORD.

require("dotenv").config()

const readline = require("node:readline")
const { parseArgs } = require("node:util")
const pool = require("../src/config/database")
const { hashPassword, normalizarCorreo } = require("../src/services/auth.service")
const { ROLES, MIN_PASSWORD_LENGTH } = require("../src/constants/auth.constants")

const { values: opciones } = parseArgs({
    options: {
        correo: { type: "string" },
        nombre: { type: "string" },
        rol: { type: "string" },
        actualizar: { type: "boolean", default: false },
        desactivar: { type: "boolean", default: false }
    }
})

const fallar = (mensaje) => {
    console.error(`Error: ${mensaje}`)
    process.exit(1)
}

const esCorreoValido = (correo) => {
    const partes = correo.split("@")
    if (partes.length !== 2 || correo.includes(" ")) return false
    const [usuario, dominio] = partes
    return usuario.length > 0 && dominio.includes(".") && !dominio.startsWith(".") && !dominio.endsWith(".")
}

const preguntarOculto =(pregunta) => new Promise((resolve) => {

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })

    let mostrarPregunta = true
    rl._writeToOutput = (texto) => {
        if (mostrarPregunta) rl.output.write(texto)
    }

    rl.question(pregunta, (respuesta) => {
        rl.output.write("\n")
        rl.close()
        resolve(respuesta)
    })

    mostrarPregunta = false

})

const obtenerPassword = async () => {

    if (process.env.USUARIO_PASSWORD) return process.env.USUARIO_PASSWORD

    if (!process.stdin.isTTY) {
        fallar("No hay terminal interactiva: define la contraseña en USUARIO_PASSWORD.")
    }

    const password = await preguntarOculto("Contraseña: ")
    const confirmacion = await preguntarOculto("Repite la contraseña: ")

    if (password !== confirmacion) fallar("Las contraseñas no coinciden.")

    return password

}

const main = async () => {

    const correo = normalizarCorreo(opciones.correo)

    if (!esCorreoValido(correo)) fallar("Indica un --correo válido.")

    if (opciones.desactivar) {
        const resultado = await pool.query(
            "UPDATE usuarios SET activo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE correo = $1 RETURNING id",
            [correo]
        )
        if (resultado.rowCount === 0) fallar(`No existe el usuario ${correo}.`)
        console.log(`Usuario ${correo} desactivado. Sus sesiones dejan de funcionar al momento.`)
        return
    }

    const existente = (await pool.query("SELECT id, nombre, rol FROM usuarios WHERE correo = $1", [correo])).rows[0]

    if (existente && !opciones.actualizar) {
        fallar(`El usuario ${correo} ya existe. Usa --actualizar para cambiar su contraseña, nombre o rol.`)
    }

    if (!existente && opciones.actualizar) fallar(`No existe el usuario ${correo}.`)

    const rol = opciones.rol || existente?.rol
    const nombre = (opciones.nombre || existente?.nombre || "").trim()

    if (!Object.values(ROLES).includes(rol)) fallar(`--rol debe ser ${Object.values(ROLES).join(" u ")}.`)
    if (nombre.length < 2) fallar("Indica un --nombre de al menos 2 caracteres.")

    const password = await obtenerPassword()

    if (password.length < MIN_PASSWORD_LENGTH) {
        fallar(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
    }

    const passwordHash = await hashPassword(password)

    if (existente) {
        await pool.query(`
            UPDATE usuarios
            SET nombre = $1, rol = $2, password_hash = $3, activo = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
        `, [nombre, rol, passwordHash, existente.id])
        console.log(`Usuario ${correo} actualizado (rol: ${rol}).`)
    } else {
        await pool.query(`
            INSERT INTO usuarios (correo, nombre, password_hash, rol)
            VALUES ($1, $2, $3, $4)
        `, [correo, nombre, passwordHash, rol])
        console.log(`Usuario ${correo} creado (rol: ${rol}).`)
    }

}

main()
    .catch((error) => fallar(error.message))
    .finally(() => pool.end())
