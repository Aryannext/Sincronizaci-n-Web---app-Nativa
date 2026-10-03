const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const errorMiddleware = require("./middleware/error.middleware")
const { generalLimiter } = require("./middleware/rateLimit.middleware")
const { autenticar, autorizar } = require("./middleware/auth.middleware")
const { securityConfig } = require("./config/security")
const { ROLES } = require("./constants/auth.constants")
const AppError = require("./errors/AppError")
const syncRoutes = require("./routes/sync.routes")
const authRoutes = require("./routes/auth.routes")

const personasRoutes = require("./routes/personas.routes")

const app = express()

// Detrás de un proxy HTTPS (Nginx, Caddy...) la IP real llega en X-Forwarded-For
app.set("trust proxy", securityConfig.trustProxy)

app.use(helmet())

app.use(cors({
    // Las apps nativas no envían Origin; los navegadores solo desde los orígenes permitidos
    origin: (origen, callback) => {
        if (!origen || securityConfig.corsOrigins.includes(origen)) {
            return callback(null, true)
        }
        callback(new AppError("Origen no permitido por CORS.", 403))
    },
    // El navegador reutiliza el preflight 10 minutos en vez de repetirlo en cada consulta
    maxAge: 600
}))

app.use(express.json({ limit: "200kb" }))

app.use(generalLimiter)

app.get("/", (_req, res) => {
    res.json({
        mensaje: "API Offline Sync funcionando correctamente"
    })
})

// Ruta
app.use("/api/auth", authRoutes)
app.use("/api/personas", autenticar, autorizar(ROLES.ADMIN), personasRoutes)
app.use("/api/sync", autenticar, autorizar(ROLES.ADMIN, ROLES.OPERADOR), syncRoutes)

app.use(errorMiddleware)


module.exports = app
