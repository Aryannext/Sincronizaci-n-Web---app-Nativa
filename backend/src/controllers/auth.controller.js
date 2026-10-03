const authService = require("../services/auth.service")
const asyncHandler = require("../utils/asyncHandler")

const iniciarSesion = asyncHandler(async (req, res) => {

    const { correo, password } = req.body

    const sesion = await authService.iniciarSesion(correo, password)

    res.status(200).json(sesion)

})

const obtenerUsuarioActual = (req, res) => {

    res.status(200).json(req.usuario)

}

module.exports = {
    iniciarSesion,
    obtenerUsuarioActual
}
