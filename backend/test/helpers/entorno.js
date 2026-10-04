// Entorno de pruebas: PostgreSQL embebido (no hace falta instalarlo) + la API real.
// Cada archivo de test corre en su propio proceso y llama a crearEntorno() una vez.

const crypto = require("node:crypto")
const fs = require("node:fs")
const net = require("node:net")
const os = require("node:os")
const path = require("node:path")

const DATABASE_DIR = path.join(__dirname, "..", "..", "src", "database")

const MIGRACIONES = [
    "02_create_tables.sql",
    "03_seed.sql",
    "04_add_version_column.sql",
    "05_create_usuarios.sql",
    "06_correo_unico_activos.sql",
    "07_registrar_personas_sin_historial.sql"
]

const aleatorio = (bytes = 18) => crypto.randomBytes(bytes).toString("base64url")

const leerSql = (archivo) => fs.readFileSync(path.join(DATABASE_DIR, archivo), "utf8")

const puertoLibre = () => new Promise((resolve, reject) => {
    const servidor = net.createServer()
    servidor.unref()
    servidor.on("error", reject)
    servidor.listen(0, "127.0.0.1", () => {
        const { port } = servidor.address()
        servidor.close(() => resolve(port))
    })
})

// Levanta un PostgreSQL vacío en un puerto libre y una carpeta temporal
const iniciarPostgres = async () => {

    const { default: EmbeddedPostgres } = await import("embedded-postgres")

    const port = await puertoLibre()
    const databaseDir = path.join(os.tmpdir(), `pg-test-${process.pid}-${aleatorio(6)}`)

    const postgres = new EmbeddedPostgres({
        databaseDir,
        user: "postgres",
        password: "postgres",
        port,
        persistent: false,
        // PostgreSQL 18 usa procesos "io_worker" para leer y escribir en disco. En Windows
        // sobreviven al cierre y dejan colgada la suite; con io_method=sync no se crean.
        postgresFlags: ["-c", "io_method=sync"],
        onLog: () => {},
        onError: () => {}
    })

    await postgres.initialise()
    await postgres.start()

    return {
        port,
        conexion: { host: "127.0.0.1", port, user: "postgres", password: "postgres", database: "postgres" },
        // Si PostgreSQL no confirma el cierre en 15 s se sigue igual: un cierre lento
        // no debe bloquear los demás archivos de test
        detener: () => Promise.race([
            postgres.stop(),
            new Promise((resolve) => setTimeout(resolve, 15000).unref())
        ])
    }

}

const crearEntorno = async () => {

    const postgres = await iniciarPostgres()

    const passwords = {
        admin: aleatorio(),
        operador: aleatorio()
    }

    // Se fija todo explícitamente para que un backend/.env local no cambie el resultado
    Object.assign(process.env, {
        DOTENV_CONFIG_QUIET: "true",
        DB_HOST: postgres.conexion.host,
        DB_PORT: String(postgres.port),
        DB_USER: postgres.conexion.user,
        DB_PASSWORD: postgres.conexion.password,
        DB_NAME: postgres.conexion.database,
        JWT_SECRET: crypto.randomBytes(48).toString("hex"),
        JWT_EXPIRES_ADMIN: "8h",
        JWT_EXPIRES_OPERADOR: "30d",
        CORS_ORIGINS: "http://localhost:5173",
        TRUST_PROXY: "0",
        RATE_LIMIT_MAX: "100000",
        RATE_LIMIT_LOGIN_MAX: "10"
    })

    // Se cargan después de fijar el entorno: el pool y la configuración leen process.env al cargarse
    const pool = require("../../src/config/database")
    const { hashPassword } = require("../../src/services/auth.service")
    const app = require("../../src/app")

    // Todas las migraciones en una sola consulta: PostgreSQL las ejecuta en orden
    await pool.query(MIGRACIONES.map(leerSql).join(";\n"))

    const crearUsuario = async (correo, nombre, rol, password, activo = true) => {
        await pool.query(
            "INSERT INTO usuarios (correo, nombre, password_hash, rol, activo) VALUES ($1, $2, $3, $4, $5)",
            [correo, nombre, await hashPassword(password), rol, activo]
        )
    }

    await crearUsuario("admin@prueba.com", "Admin Prueba", "admin", passwords.admin)
    await crearUsuario("movil1@prueba.com", "Tablet 1", "operador", passwords.operador)
    await crearUsuario("movil2@prueba.com", "Tablet 2", "operador", passwords.operador, false)

    const servidor = await new Promise((resolve) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s))
    })

    const origen = `http://127.0.0.1:${servidor.address().port}`

    // Petición a la API: devuelve status, cuerpo JSON (si lo hay) y cabeceras
    const llamar = async (ruta, { token, method = "GET", body, headers = {}, raw } = {}) => {
        const conCuerpo = body !== undefined || raw !== undefined
        const respuesta = await fetch(ruta.startsWith("http") ? ruta : `${origen}/api${ruta}`, {
            method,
            headers: {
                ...(conCuerpo ? { "Content-Type": "application/json" } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...headers
            },
            body: raw ?? (body === undefined ? undefined : JSON.stringify(body))
        })
        let data = null
        try {
            data = await respuesta.json()
        } catch {
            // respuesta sin cuerpo JSON
        }
        return { status: respuesta.status, data, headers: respuesta.headers }
    }

    const login = (correo, password) =>
        llamar("/auth/login", { method: "POST", body: { correo, password } })

    const tokens = {
        admin: (await login("admin@prueba.com", passwords.admin)).data.token,
        operador: (await login("movil1@prueba.com", passwords.operador)).data.token
    }

    // Deja personas y sync_log como recién instalados (los usuarios se mantienen)
    const reiniciarDatos = async () => {
        await pool.query("TRUNCATE personas, sync_log RESTART IDENTITY")
        await pool.query(leerSql("03_seed.sql"))
    }

    const cerrar = async () => {
        // fetch mantiene conexiones abiertas (keep-alive): se cierran para que close() no espere
        servidor.closeAllConnections()
        await new Promise((resolve) => servidor.close(resolve))
        await pool.end()
        await postgres.detener()
    }

    return {
        origen,
        pool,
        passwords,
        tokens,
        llamar,
        login,
        reiniciarDatos,
        cerrar
    }

}

module.exports = {
    crearEntorno,
    iniciarPostgres,
    leerSql
}
