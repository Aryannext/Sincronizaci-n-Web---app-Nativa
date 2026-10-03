const SYNC_OPERATIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE'
}

// Resultado de cada operación enviada a POST /api/sync/push
const PUSH_STATUS = {
    APPLIED: 'applied',     // se aplicó (o ya estaba aplicada en un reintento)
    DUPLICATE: 'duplicate', // CREATE de un uuid que ya existe en el servidor
    CONFLICT: 'conflict',   // base_version no coincide: se devuelve la versión del servidor
    NOT_FOUND: 'not_found', // UPDATE/DELETE de un uuid que el servidor no conoce
    INVALID: 'invalid',     // la operación no pasó la validación
    REJECTED: 'rejected'    // la base de datos la rechazó (ej. correo repetido)
}

const MAX_PUSH_OPERATIONS = 200

// Máximo de eventos por página en GET /api/sync
const MAX_PULL_LIMIT = 1000

module.exports = {
    SYNC_OPERATIONS,
    PUSH_STATUS,
    MAX_PUSH_OPERATIONS,
    MAX_PULL_LIMIT
}
