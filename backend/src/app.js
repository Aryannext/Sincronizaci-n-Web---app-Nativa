const express = require("express")
const cors = require("cors")
const errorMiddleware = require("./middleware/error.middleware")
const syncRoutes = require("./routes/sync.routes")

const personasRoutes = require("./routes/personas.routes")

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (_req, res) => {
    res.json({
        mensaje: "API Offline Sync funcionando correctamente"
    })
})

// Ruta
app.use("/api/personas", personasRoutes)
app.use("/api/sync", syncRoutes)

app.use(errorMiddleware)


module.exports = app
