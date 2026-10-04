const { test, before, after } = require("node:test")
const assert = require("node:assert/strict")
const { spawn } = require("node:child_process")
const crypto = require("node:crypto")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { Client, Pool } = require("pg")
const { iniciarPostgres } = require("./helpers/entorno")
const { migrar } = require("../src/database/migrar")

let postgres
let admin
const pools = []

before(async () => {
    postgres = await iniciarPostgres()
    admin = new Client(postgres.conexion)
    await admin.connect()
})

after(async () => {
    await Promise.all(pools.map(pool => pool.end()))
    await admin?.end()
    await postgres?.detener()
})

// Cada test trabaja sobre una base vacía propia
const baseNueva = async () => {
    const nombre = `migrar_${crypto.randomBytes(4).toString("hex")}`
    await admin.query(`CREATE DATABASE ${nombre}`)
    const pool = new Pool({ ...postgres.conexion, database: nombre })
    pools.push(pool)
    return { nombre, pool }
}

const contar = async (pool, tabla) =>
    Number((await pool.query(`SELECT count(*) FROM ${tabla}`)).rows[0].count)

test("base vacía: crea el esquema, los datos de ejemplo y aplica las migraciones", async () => {
    const { pool } = await baseNueva()

    const aplicados = await migrar(pool)

    assert.deepEqual(aplicados.slice(0, 2), ["02_create_tables.sql", "03_seed.sql"])
    assert.ok(aplicados.includes("07_registrar_personas_sin_historial.sql"))
    assert.ok(!aplicados.includes("01_create_database.sql"))

    const personas = await contar(pool, "personas")
    assert.ok(personas > 0)
    // Los dispositivos descargan los datos de ejemplo: cada persona tiene su evento
    assert.equal(await contar(pool, "sync_log"), personas)
    assert.equal(await contar(pool, "usuarios"), 0)
})

test("se puede repetir: no vuelve a instalar ni duplica nada, y respeta los datos existentes", async () => {
    const { pool } = await baseNueva()
    await migrar(pool)
    await pool.query(
        "INSERT INTO usuarios (correo, nombre, password_hash, rol) VALUES ('admin@prueba.com', 'Admin', 'hash', 'admin')"
    )
    const personas = await contar(pool, "personas")
    const eventos = await contar(pool, "sync_log")

    const aplicados = await migrar(pool)

    assert.ok(!aplicados.includes("02_create_tables.sql"))
    assert.ok(!aplicados.includes("03_seed.sql"))
    assert.equal(await contar(pool, "personas"), personas)
    assert.equal(await contar(pool, "sync_log"), eventos)
    assert.equal(await contar(pool, "usuarios"), 1)
})

test("dos arranques a la vez: el candado evita instalar dos veces", async () => {
    const { nombre, pool } = await baseNueva()
    const otroPool = new Pool({ ...postgres.conexion, database: nombre })
    pools.push(otroPool)

    await Promise.all([migrar(pool), migrar(otroPool)])

    const personas = await contar(pool, "personas")
    assert.equal(await contar(pool, "sync_log"), personas)
    const unaInstalacion = new Pool({ ...postgres.conexion, database: (await baseNueva()).nombre })
    pools.push(unaInstalacion)
    await migrar(unaInstalacion)
    assert.equal(personas, await contar(unaInstalacion, "personas"))
})

test("una migración que falla se deshace entera y detiene el arranque con su nombre", async () => {
    const { pool } = await baseNueva()
    await migrar(pool)

    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), "migraciones-"))
    fs.writeFileSync(path.join(directorio, "08_rota.sql"),
        "CREATE TABLE a_medias (id INT);\nSELECT * FROM tabla_que_no_existe;")

    await assert.rejects(migrar(pool, { directorio }), /La migración 08_rota\.sql falló/)

    // CREATE TABLE no quedó aplicado a medias
    const { rows } = await pool.query("SELECT to_regclass('public.a_medias') AS tabla")
    assert.equal(rows[0].tabla, null)
    fs.rmSync(directorio, { recursive: true, force: true })
})

test("el servidor con MIGRAR_AL_INICIAR=true deja la base al día antes de escuchar", async () => {
    const { nombre, pool } = await baseNueva()

    const servidor = spawn(process.execPath, ["src/server.js"], {
        cwd: path.join(__dirname, ".."),
        env: {
            ...process.env,
            DOTENV_CONFIG_QUIET: "true",
            DB_HOST: postgres.conexion.host,
            DB_PORT: String(postgres.port),
            DB_USER: postgres.conexion.user,
            DB_PASSWORD: postgres.conexion.password,
            DB_NAME: nombre,
            JWT_SECRET: crypto.randomBytes(48).toString("hex"),
            HOST: "127.0.0.1",
            PORT: "0",
            MIGRAR_AL_INICIAR: "true"
        }
    })

    try {
        const salida = await new Promise((resolve, reject) => {
            let texto = ""
            servidor.stdout.on("data", (parte) => {
                texto += parte
                if (texto.includes("Servidor ejecutandose")) resolve(texto)
            })
            servidor.stderr.on("data", (parte) => { texto += parte })
            servidor.on("exit", (codigo) => reject(new Error(`El servidor terminó (${codigo}): ${texto}`)))
        })

        assert.match(salida, /Base de datos al día: 02_create_tables\.sql, 03_seed\.sql/)
        // Primero migra y después escucha
        assert.ok(salida.indexOf("Base de datos al día") < salida.indexOf("Servidor ejecutandose"))
        assert.ok(await contar(pool, "personas") > 0)
    } finally {
        servidor.kill()
    }
})
