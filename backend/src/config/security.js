require("dotenv").config()

const MIN_JWT_SECRET_LENGTH = 32

const entero = (valor, porDefecto) => {
    const numero = Number.parseInt(valor, 10)
    return Number.isInteger(numero) && numero > 0 ? numero : porDefecto
}

// Comprueba la configuración al arrancar: sin un secreto fuerte la API no debe levantarse
const validarConfiguracion = () => {

    const secreto = process.env.JWT_SECRET || ""

    if (secreto.length < MIN_JWT_SECRET_LENGTH) {
        throw new Error(
            `JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres. ` +
            "Genera uno con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
        )
    }

}

const securityConfig = {

    jwtSecret: () => process.env.JWT_SECRET,

    // El operador trabaja offline durante días; el admin usa la web en sesiones cortas
    jwtExpiresIn: {
        admin: process.env.JWT_EXPIRES_ADMIN || "8h",
        operador: process.env.JWT_EXPIRES_OPERADOR || "30d"
    },

    // Orígenes del panel web autorizados por CORS (separados por coma)
    corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173")
        .split(",")
        .map(origen => origen.trim())
        .filter(Boolean),

    // Número de proxies delante de la API (ej. 1 detrás de Nginx/Caddy con HTTPS)
    trustProxy: entero(process.env.TRUST_PROXY, 0),

    rateLimit: {
        ventanaMs: 15 * 60 * 1000,
        maxGeneral: entero(process.env.RATE_LIMIT_MAX, 1000),
        maxLogin: entero(process.env.RATE_LIMIT_LOGIN_MAX, 10)
    }

}

module.exports = {
    securityConfig,
    validarConfiguracion
}
