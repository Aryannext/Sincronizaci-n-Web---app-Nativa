const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const pool = require("../config/database")
const AppError = require("../errors/AppError")
const { securityConfig } = require("../config/security")
const { BCRYPT_ROUNDS } = require("../constants/auth.constants")

const USUARIO_COLUMNS = `
    id,
    correo,
    nombre,
    rol,
    activo
`

// Hash de una contraseña que nadie conoce: se compara contra él cuando el correo
// no existe, para que la respuesta tarde lo mismo y no revele qué correos están registrados
const HASH_FICTICIO = bcrypt.hashSync("contrasena-ficticia-para-igualar-tiempos", BCRYPT_ROUNDS)

const CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos."

const normalizarCorreo = (correo) => String(correo || "").trim().toLowerCase()

const generarToken = (usuario) =>
    jwt.sign(
        { rol: usuario.rol },
        securityConfig.jwtSecret(),
        {
            subject: String(usuario.id),
            expiresIn: securityConfig.jwtExpiresIn[usuario.rol],
            algorithm: "HS256"
        }
    )

const iniciarSesion = async (correo, password) => {

    const resultado = await pool.query(`
        SELECT
            ${USUARIO_COLUMNS},
            password_hash
        FROM usuarios
        WHERE correo = $1
    `, [normalizarCorreo(correo)])

    const usuario = resultado.rows[0]

    const passwordValida = await bcrypt.compare(
        String(password || ""),
        usuario ? usuario.password_hash : HASH_FICTICIO
    )

    if (!usuario || !passwordValida || !usuario.activo) {
        throw new AppError(CREDENCIALES_INVALIDAS, 401)
    }

    return {
        token: generarToken(usuario),
        // Sin password_hash: solo los datos públicos del usuario
        usuario: {
            id: usuario.id,
            correo: usuario.correo,
            nombre: usuario.nombre,
            rol: usuario.rol,
            activo: usuario.activo
        }
    }

}

// Verifica el token y devuelve el usuario actual desde la base de datos,
// así un usuario desactivado o con otro rol pierde el acceso al momento
const verificarToken = async (token) => {

    let payload

    try {
        payload = jwt.verify(token, securityConfig.jwtSecret(), { algorithms: ["HS256"] })
    } catch {
        throw new AppError("Sesión inválida o expirada. Inicia sesión de nuevo.", 401)
    }

    const resultado = await pool.query(`
        SELECT
            ${USUARIO_COLUMNS}
        FROM usuarios
        WHERE id = $1
    `, [Number(payload.sub)])

    const usuario = resultado.rows[0]

    if (!usuario?.activo) {
        throw new AppError("Sesión inválida o expirada. Inicia sesión de nuevo.", 401)
    }

    return usuario

}

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS)

module.exports = {
    iniciarSesion,
    verificarToken,
    hashPassword,
    normalizarCorreo
}
