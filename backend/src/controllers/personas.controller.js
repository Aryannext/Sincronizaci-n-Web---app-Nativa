const personasService = require("../services/personas.service")
const asyncHandler = require("../utils/asyncHandler")

const obtenerPersonas = asyncHandler(async (_req, res) => {

    const personas = await personasService.obtenerPersonas()

    res.status(200).json(personas)

})

const obtenerPersonaPorId = asyncHandler(async (_req, res) => {

    const { id } = _req.params

    const persona = await personasService.obtenerPersonaPorId(id)

    res.status(200).json(persona)

})

const crearPersona = asyncHandler(async (_req, res) => {

    const persona = await personasService.crearPersona(_req.body, _req.usuario.id)

    res.status(201).json(persona)

})

const actualizarPersona = asyncHandler(async (_req, res) => {

    const { id } = _req.params

    const persona = await personasService.actualizarPersona(
        id,
        _req.body,
        _req.usuario.id
    )

    res.status(200).json(persona)

})

const eliminarPersona = asyncHandler(async (_req, res) => {

    const { id } = _req.params

    const persona = await personasService.eliminarPersona(id, _req.usuario.id)

    res.status(200).json(persona)

})

const obtenerPersonasEliminadas = asyncHandler(async (_req, res) => {

    const personas = await personasService.obtenerPersonasEliminadas()

    res.status(200).json(personas)

})

const restaurarPersona = asyncHandler(async (_req, res) => {

    const { id } = _req.params

    const persona = await personasService.restaurarPersona(
        id,
        _req.body?.version,
        _req.usuario.id
    )

    res.status(200).json(persona)

})

module.exports = {
    obtenerPersonas,
    obtenerPersonasEliminadas,
    obtenerPersonaPorId,
    crearPersona,
    actualizarPersona,
    eliminarPersona,
    restaurarPersona
}