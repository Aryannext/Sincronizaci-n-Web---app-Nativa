const pool = require("../config/database")
const syncService = require("./sync.service")
const { SYNC_OPERATIONS } = require("../constants/sync.constants")
const { TABLES } = require("../constants/database.constants")
const AppError = require("../errors/AppError")

const PERSONA_COLUMNS = `
    id,
    uuid,
    nombre,
    apellido,
    telefono,
    correo,
    created_at,
    updated_at,
    deleted_at,
    version
`

const obtenerPersonas = async () => {
    const resultado = await pool.query(`
        SELECT
            ${PERSONA_COLUMNS}
        FROM personas
        WHERE deleted_at IS NULL
        ORDER BY id ASC
    `)

    return resultado.rows
}

const obtenerPersonaPorId = async (id) => {

    const resultado = await pool.query(`
        SELECT
            ${PERSONA_COLUMNS}
        FROM personas
        WHERE id = $1
        AND deleted_at IS NULL
    `, [id])

    const persona = resultado.rows[0]

    if (!persona) {
        throw new AppError(
            "Persona no encontrada",
            404
        )
    }

    return persona

}

const crearPersona = async (persona) => {

    const client = await pool.connect()

    try {

        await client.query("BEGIN")

        const {
            nombre,
            apellido,
            telefono,
            correo
        } = persona

        const resultado = await client.query(`
            INSERT INTO personas (
                nombre,
                apellido,
                telefono,
                correo
            )
            VALUES ($1, $2, $3, $4)
            RETURNING
                ${PERSONA_COLUMNS}
        `, [
            nombre,
            apellido,
            telefono,
            correo
        ])

        const nuevaPersona = resultado.rows[0]

        await syncService.registrarCambio(
            client,
            TABLES.PERSONAS,
            nuevaPersona.uuid,
            SYNC_OPERATIONS.CREATE
        )

        await client.query("COMMIT")

        return nuevaPersona

    } catch (error) {

        await client.query("ROLLBACK")

        throw error

    } finally {

        client.release()

    }

}

const actualizarPersona = async (id, persona) => {

    const client = await pool.connect()

    try {

        await client.query("BEGIN")

        const {
            nombre,
            apellido,
            telefono,
            correo
        } = persona

        const resultado = await client.query(`
            UPDATE personas
            SET
                nombre = $1,
                apellido = $2,
                telefono = $3,
                correo = $4,
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            AND deleted_at IS NULL
            RETURNING
                ${PERSONA_COLUMNS}
        `, [
            nombre,
            apellido,
            telefono,
            correo,
            id
        ])

        const personaActualizada = resultado.rows[0]

        if (!personaActualizada) {
            throw new AppError(
                "Persona no encontrada",
                404
            )
        }

        await syncService.registrarCambio(
            client,
            TABLES.PERSONAS,
            personaActualizada.uuid,
            SYNC_OPERATIONS.UPDATE
        )

        await client.query("COMMIT")

        return personaActualizada

    } catch (error) {

        await client.query("ROLLBACK")

        throw error

    } finally {

        client.release()

    }

}

const eliminarPersona = async (id) => {

    const client = await pool.connect()

    try {

        await client.query("BEGIN")

        const resultado = await client.query(`
            UPDATE personas
            SET
                deleted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE id = $1
            AND deleted_at IS NULL
            RETURNING
                ${PERSONA_COLUMNS}
        `, [id])

        const personaEliminada = resultado.rows[0]

        if (!personaEliminada) {
            throw new AppError(
                "Persona no encontrada",
                404
            )
        }

        await syncService.registrarCambio(
            client,
            TABLES.PERSONAS,
            personaEliminada.uuid,
            SYNC_OPERATIONS.DELETE
        )

        await client.query("COMMIT")

        return personaEliminada

    } catch (error) {

        await client.query("ROLLBACK")

        throw error

    } finally {

        client.release()

    }

}

module.exports = {
    obtenerPersonas,
    obtenerPersonaPorId,
    crearPersona,
    actualizarPersona,
    eliminarPersona
}