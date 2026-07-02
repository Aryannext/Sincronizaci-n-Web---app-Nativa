require("dotenv").config()

const app = require("./app")
const pool = require("./config/database")

const PORT = process.env.PORT || 3000

async function iniciarServidor() {
    try {
        //verficacion a la conexion a PostgreSQL
        await pool.query("SELECT NOW()")

        console.log("Conectado a PostgreSQL")

        app.listen(PORT, () => {
            console.log("Servidor ejecutandose en el puerto " + PORT)
        })
    } catch (error) {
        console.error("Error al conectar con PostgreSQL")
        console.error(error.message)
    }
}

iniciarServidor()