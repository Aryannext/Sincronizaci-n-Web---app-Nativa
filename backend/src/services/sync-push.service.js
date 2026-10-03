const pool = require("../config/database")
const syncService = require("./sync.service")
const { PERSONA_COLUMNS } = require("./personas.service")
const { SYNC_OPERATIONS, PUSH_STATUS } = require("../constants/sync.constants")
const { TABLES } = require("../constants/database.constants")
const { validarOperacion } = require("../validators/sync.validator")

const CAMPOS_PERSONA = ["nombre", "apellido", "telefono", "correo"]

const obtenerPorUuid = async (client, uuid) => {

    const resultado = await client.query(`
        SELECT
            ${PERSONA_COLUMNS}
        FROM personas
        WHERE uuid = $1
    `, [uuid])

    return resultado.rows[0] || null

}

const mismosDatos = (persona, data) =>
    CAMPOS_PERSONA.every(campo => persona[campo] === data[campo])

const crear = async (client, { uuid, data }) => {

    // El uuid lo genera el móvil: si ya existe, es un reintento y no se duplica
    const resultado = await client.query(`
        INSERT INTO personas (
            uuid,
            nombre,
            apellido,
            telefono,
            correo
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (uuid) DO NOTHING
        RETURNING
            ${PERSONA_COLUMNS}
    `, [
        uuid,
        data.nombre,
        data.apellido,
        data.telefono,
        data.correo
    ])

    const creada = resultado.rows[0]

    if (!creada) {
        return {
            status: PUSH_STATUS.DUPLICATE,
            record: await obtenerPorUuid(client, uuid)
        }
    }

    await syncService.registrarCambio(
        client,
        TABLES.PERSONAS,
        creada.uuid,
        SYNC_OPERATIONS.CREATE
    )

    return { status: PUSH_STATUS.APPLIED, record: creada }

}

const actualizar = async (client, { uuid, base_version, data }) => {

    const resultado = await client.query(`
        UPDATE personas
        SET
            nombre = $1,
            apellido = $2,
            telefono = $3,
            correo = $4,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE uuid = $5
        AND version = $6
        AND deleted_at IS NULL
        RETURNING
            ${PERSONA_COLUMNS}
    `, [
        data.nombre,
        data.apellido,
        data.telefono,
        data.correo,
        uuid,
        base_version
    ])

    const actualizada = resultado.rows[0]

    if (actualizada) {

        await syncService.registrarCambio(
            client,
            TABLES.PERSONAS,
            actualizada.uuid,
            SYNC_OPERATIONS.UPDATE
        )

        return { status: PUSH_STATUS.APPLIED, record: actualizada }

    }

    const actual = await obtenerPorUuid(client, uuid)

    if (!actual) {
        return { status: PUSH_STATUS.NOT_FOUND }
    }

    // Reintento de un UPDATE que ya se aplicó pero cuya respuesta no llegó al móvil
    const yaAplicada =
        !actual.deleted_at &&
        actual.version === base_version + 1 &&
        mismosDatos(actual, data)

    if (yaAplicada) {
        return { status: PUSH_STATUS.APPLIED, record: actual }
    }

    return { status: PUSH_STATUS.CONFLICT, server: actual }

}

const eliminar = async (client, { uuid, base_version }) => {

    const resultado = await client.query(`
        UPDATE personas
        SET
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE uuid = $1
        AND version = $2
        AND deleted_at IS NULL
        RETURNING
            ${PERSONA_COLUMNS}
    `, [
        uuid,
        base_version
    ])

    const eliminada = resultado.rows[0]

    if (eliminada) {

        await syncService.registrarCambio(
            client,
            TABLES.PERSONAS,
            eliminada.uuid,
            SYNC_OPERATIONS.DELETE
        )

        return { status: PUSH_STATUS.APPLIED, record: eliminada }

    }

    const actual = await obtenerPorUuid(client, uuid)

    if (!actual) {
        return { status: PUSH_STATUS.NOT_FOUND }
    }

    // Ya estaba borrado (reintento u otro dispositivo): el resultado que pidió el móvil se cumple
    if (actual.deleted_at) {
        return { status: PUSH_STATUS.APPLIED, record: actual }
    }

    return { status: PUSH_STATUS.CONFLICT, server: actual }

}

const MANEJADORES = {
    [SYNC_OPERATIONS.CREATE]: crear,
    [SYNC_OPERATIONS.UPDATE]: actualizar,
    [SYNC_OPERATIONS.DELETE]: eliminar
}

const aplicarOperacion = async (client, operacionRecibida) => {

    const validacion = await validarOperacion(operacionRecibida)

    if (!validacion.valida) {
        return {
            op: operacionRecibida?.op ?? null,
            uuid: operacionRecibida?.uuid ?? null,
            status: PUSH_STATUS.INVALID,
            errors: validacion.errores
        }
    }

    const operacion = validacion.operacion

    // Cada operación va en su propia transacción: una que falle no bloquea las demás
    try {

        await client.query("BEGIN")

        const resultado = await MANEJADORES[operacion.op](client, operacion)

        await client.query("COMMIT")

        return {
            op: operacion.op,
            uuid: operacion.uuid,
            ...resultado
        }

    } catch (error) {

        await client.query("ROLLBACK")

        if (error.code === "23505") {

            // Dos envíos simultáneos del mismo CREATE: PostgreSQL puede reportar el choque
            // en el índice del correo antes que en el del uuid. Si el uuid ya existe, es un duplicado.
            if (operacion.op === SYNC_OPERATIONS.CREATE) {

                const existente = await obtenerPorUuid(client, operacion.uuid)

                if (existente) {
                    return {
                        op: operacion.op,
                        uuid: operacion.uuid,
                        status: PUSH_STATUS.DUPLICATE,
                        record: existente
                    }
                }

            }

            return {
                op: operacion.op,
                uuid: operacion.uuid,
                status: PUSH_STATUS.REJECTED,
                message: "El correo ya está registrado."
            }
        }

        // Errores de infraestructura: el lote completo responde 500 y el móvil lo reintenta.
        // Las operaciones ya aplicadas son seguras de reenviar gracias al uuid y base_version.
        throw error

    }

}

// Aplica las operaciones en el orden recibido y devuelve un resultado por cada una
const aplicarOperaciones = async (operaciones) => {

    const client = await pool.connect()

    try {

        const resultados = []

        // Secuencial a propósito: el orden importa (un UPDATE puede depender del CREATE
        // anterior del mismo lote) y todas las operaciones comparten la misma conexión.
        for (const [index, operacion] of operaciones.entries()) {
            resultados.push({
                index,
                ...(await aplicarOperacion(client, operacion)) // NOSONAR
            })
        }

        return resultados

    } finally {

        client.release()

    }

}

module.exports = {
    aplicarOperaciones
}
