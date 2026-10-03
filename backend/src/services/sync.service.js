const pool = require("../config/database")

const registrarCambio = async (
    client,
    tableName,
    recordUuid,
    operation,
    usuarioId = null
) => {

    await client.query(`
        INSERT INTO sync_log (
            table_name,
            record_uuid,
            operation,
            usuario_id
        )
        VALUES ($1, $2, $3, $4)
    `, [
        tableName,
        recordUuid,
        operation,
        usuarioId
    ])
}

const obtenerCambios = async (
    lastChangeId = 0,
    limit = 100
) => {

    const resultado = await pool.query(`
        SELECT
            sl.change_id,
            sl.table_name,
            sl.record_uuid,
            sl.operation,
            sl.created_at,
            u.nombre AS usuario,

            json_build_object(
                'uuid', p.uuid,
                'nombre', p.nombre,
                'apellido', p.apellido,
                'telefono', p.telefono,
                'correo', p.correo,
                'version', p.version,
                'deleted_at', p.deleted_at
            ) AS data

        FROM sync_log sl

        LEFT JOIN personas p
            ON p.uuid = sl.record_uuid

        LEFT JOIN usuarios u
            ON u.id = sl.usuario_id

        WHERE sl.change_id > $1

        ORDER BY sl.change_id ASC

        LIMIT $2
    `, [
        lastChangeId,
        limit
    ])

    const cambios = resultado.rows

    const ultimoChangeId =
        cambios.length > 0
            ? Number(cambios[cambios.length - 1].change_id)
            : Number(lastChangeId)

    return {

        last_change_id: ultimoChangeId,

        changes: cambios

    }

}

module.exports = {
    registrarCambio,
    obtenerCambios
}