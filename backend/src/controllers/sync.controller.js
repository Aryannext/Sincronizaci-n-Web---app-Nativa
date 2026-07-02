const syncService = require("../services/sync.service")
const asyncHandler = require("../utils/asyncHandler")

const obtenerCambios = asyncHandler(async (req, res) => {

    const lastChangeId = Number(req.query.last_change_id || 0)
    const limit = Number(req.query.limit || 100)

    const cambios = await syncService.obtenerCambios(
        lastChangeId,
        limit
    )

    res.status(200).json(cambios)

})

module.exports = {
    obtenerCambios
}