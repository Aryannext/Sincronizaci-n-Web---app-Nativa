const syncService = require("../services/sync.service")
const syncPushService = require("../services/sync-push.service")
const asyncHandler = require("../utils/asyncHandler")
const AppError = require("../errors/AppError")
const { MAX_PUSH_OPERATIONS } = require("../constants/sync.constants")

const obtenerCambios = asyncHandler(async (req, res) => {

    const lastChangeId = Number(req.query.last_change_id || 0)
    const limit = Number(req.query.limit || 100)

    const cambios = await syncService.obtenerCambios(
        lastChangeId,
        limit
    )

    res.status(200).json(cambios)

})

const aplicarCambios = asyncHandler(async (req, res) => {

    const { operations } = req.body || {}

    if (!Array.isArray(operations) || operations.length === 0) {
        throw new AppError(
            "Se requiere un arreglo 'operations' con al menos una operación.",
            400
        )
    }

    if (operations.length > MAX_PUSH_OPERATIONS) {
        throw new AppError(
            `Se permiten máximo ${MAX_PUSH_OPERATIONS} operaciones por lote.`,
            400
        )
    }

    const results = await syncPushService.aplicarOperaciones(operations)

    res.status(200).json({ results })

})

module.exports = {
    obtenerCambios,
    aplicarCambios
}
