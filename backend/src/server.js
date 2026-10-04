require("dotenv").config()

const { validarConfiguracion } = require("./config/security")

const PORT = process.env.PORT || 3000
// 0.0.0.0 permite conectar desde la red local; detrás de un proxy en el mismo servidor usa 127.0.0.1
const HOST = process.env.HOST || "0.0.0.0"

async function iniciarServidor() {
    try {
        validarConfiguracion()

        const app = require("./app")
        const pool = require("./config/database")

        //verficacion a la conexion a PostgreSQL
        await pool.query("SELECT NOW()")

        console.log("Conectado a PostgreSQL")

        // En producción (despliegue/) la API deja la base al día antes de aceptar peticiones
        if (process.env.MIGRAR_AL_INICIAR === "true") {
            const { migrar } = require("./database/migrar")
            const aplicados = await migrar(pool)
            console.log("Base de datos al día: " + aplicados.join(", "))
        }

        app.listen(PORT, HOST, () => {
            console.log("Servidor ejecutandose en http://" + HOST + ":" + PORT)
        })
    } catch (error) {
        console.error("No se pudo iniciar el servidor")
        console.error(error.message)
        process.exit(1)
    }
}

iniciarServidor()
