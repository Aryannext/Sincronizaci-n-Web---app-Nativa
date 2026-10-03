const { rateLimit } = require("express-rate-limit")
const { securityConfig } = require("../config/security")

const respuesta = (message) => ({ success: false, message })

// Límite general por IP (el panel web consulta cada 8 s, así que el margen es amplio)
const generalLimiter = rateLimit({
    windowMs: securityConfig.rateLimit.ventanaMs,
    limit: securityConfig.rateLimit.maxGeneral,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: respuesta("Demasiadas peticiones. Intenta de nuevo en unos minutos.")
})

// Límite estricto para el login: frena ataques de fuerza bruta a contraseñas.
// Los inicios de sesión correctos no cuentan.
const loginLimiter = rateLimit({
    windowMs: securityConfig.rateLimit.ventanaMs,
    limit: securityConfig.rateLimit.maxLogin,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: respuesta("Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.")
})

module.exports = {
    generalLimiter,
    loginLimiter
}
