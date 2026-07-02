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

    console.log("BODY:", _req.body)

    const persona = await personasService.crearPersona(_req.body)

    res.status(201).json(persona)

})

const actualizarPersona = asyncHandler(async (_req, res) => {

    const { id } = _req.params

    const persona = await personasService.actualizarPersona(
        id,
        _req.body
    )

    res.status(200).json(persona)

})

const eliminarPersona = asyncHandler(async (_req, res) => {

    const { id } = _req.params

    const persona = await personasService.eliminarPersona(id)

    res.status(200).json(persona)

})

module.exports = {
    obtenerPersonas,
    obtenerPersonaPorId,
    crearPersona,
    actualizarPersona,
    eliminarPersona
}