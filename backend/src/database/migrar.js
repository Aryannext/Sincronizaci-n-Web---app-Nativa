const fs = require("node:fs")
const path = require("node:path")

// Base nueva: esquema completo y datos de ejemplo. Solo se aplican si no existe la tabla personas
const INSTALACION = ["02_create_tables.sql", "03_seed.sql"]

// 01 crea la base de datos: la conexión ya apunta a una que existe
const NO_SE_REPITEN = new Set(["01_create_database.sql", ...INSTALACION])

// Dos procesos que arrancan a la vez esperan su turno en vez de aplicar lo mismo en paralelo
const CANDADO = 7421030

// De la 04 en adelante, en orden: se pueden ejecutar varias veces (ver CLAUDE.md)
const migraciones = (directorio) => fs.readdirSync(directorio)
    .filter(archivo => archivo.endsWith(".sql") && !NO_SE_REPITEN.has(archivo))
    .sort()

const aplicar = async (cliente, directorio, archivo) => {
    const sql = fs.readFileSync(path.join(directorio, archivo), "utf8")
    await cliente.query("BEGIN")
    try {
        await cliente.query(sql)
        await cliente.query("COMMIT")
    } catch (error) {
        await cliente.query("ROLLBACK")
        throw new Error(`La migración ${archivo} falló: ${error.message}`, { cause: error })
    }
}

// Deja la base al día y devuelve los archivos aplicados
const migrar = async (pool, { directorio = __dirname } = {}) => {

    const cliente = await pool.connect()

    try {
        await cliente.query("SELECT pg_advisory_lock($1)", [CANDADO])

        const { rows } = await cliente.query("SELECT to_regclass('public.personas') IS NOT NULL AS existe")
        const archivos = [...(rows[0].existe ? [] : INSTALACION), ...migraciones(directorio)]

        for (const archivo of archivos) {
            await aplicar(cliente, directorio, archivo)
        }

        return archivos
    } finally {
        await cliente.query("SELECT pg_advisory_unlock($1)", [CANDADO]).catch(() => {})
        cliente.release()
    }

}

module.exports = { migrar }
