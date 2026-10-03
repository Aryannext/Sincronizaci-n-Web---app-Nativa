const { test, before, after } = require("node:test")
const assert = require("node:assert/strict")
const { Client } = require("pg")
const { iniciarPostgres, leerSql } = require("./helpers/entorno")

// Esquema tal como estaba en la primera versión del repo: sin columna version
// y con el correo UNIQUE también para personas borradas
const ESQUEMA_ORIGINAL = `
    CREATE TABLE personas (
        id SERIAL PRIMARY KEY,
        uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        correo VARCHAR(150) NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
    );
    CREATE TABLE sync_log (
        change_id BIGSERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_uuid UUID NOT NULL,
        operation VARCHAR(10) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`

let postgres
let cliente

before(async () => {
    postgres = await iniciarPostgres()
    cliente = new Client(postgres.conexion)
    await cliente.connect()
    await cliente.query(ESQUEMA_ORIGINAL)
    await cliente.query(leerSql("03_seed.sql"))
})

after(async () => {
    await cliente?.end()
    await postgres?.detener()
})

const insertar = (correo, borrado = false) => cliente.query(
    "INSERT INTO personas (nombre, apellido, telefono, correo, deleted_at) VALUES ('Ana', 'Ruiz', '3001234567', $1, $2)",
    [correo, borrado ? new Date() : null]
)

const ejecutarDosVeces = async (archivo) => {
    await cliente.query(leerSql(archivo))
    await cliente.query(leerSql(archivo))
}

test("04: añade la columna version a una base que no la tenía (y se puede repetir)", async () => {
    const actualizar = "UPDATE personas SET version = version + 1 WHERE id = 1 RETURNING version"
    await assert.rejects(cliente.query(actualizar), /column "version" does not exist/)

    await ejecutarDosVeces("04_add_version_column.sql")

    assert.equal((await cliente.query(actualizar)).rows[0].version, 2)
    assert.equal((await cliente.query("SELECT version FROM personas WHERE id = 2")).rows[0].version, 1)
})

test("05: crea usuarios y la auditoría de sync_log (y se puede repetir)", async () => {
    await ejecutarDosVeces("05_create_usuarios.sql")

    const columnas = (await cliente.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'sync_log'"
    )).rows.map(r => r.column_name)
    assert.ok(columnas.includes("usuario_id"))

    await assert.rejects(
        cliente.query("INSERT INTO usuarios (correo, nombre, password_hash, rol) VALUES ('x@x.com', 'X', 'h', 'jefe')"),
        /check constraint/
    )
})

test("06: el correo de una persona borrada se puede reutilizar, pero no entre activas (y se puede repetir)", async () => {
    await insertar("ana@example.com", true)
    await assert.rejects(insertar("ana@example.com"), (error) => error.constraint === "personas_correo_key")

    await ejecutarDosVeces("06_correo_unico_activos.sql")

    await insertar("ana@example.com")
    await assert.rejects(insertar("ana@example.com"), (error) => error.constraint === "personas_correo_activo_idx")
})
