const authService = require("../services/auth.service")
const AppError = require("../errors/AppError")
const asyncHandler = require("../utils/asyncHandler")

// Exige un token válido en "Authorization: Bearer <token>" y deja el usuario en req.usuario
const autenticar = asyncHandler(async (req, _res, next) => {

    const [esquema, token] = (req.headers.authorization || "").split(" ")

    if (esquema !== "Bearer" || !token) {
        throw new AppError("Se requiere iniciar sesión.", 401)
    }

    req.usuario = await authService.verificarToken(token)

    next()

})

// Solo deja pasar a los roles indicados. Va después de autenticar.
const autorizar = (...roles) => (req, _res, next) => {

    if (!req.usuario || !roles.includes(req.usuario.rol)) {
        return next(new AppError("No tienes permiso para esta acción.", 403))
    }

    next()

}

module.exports = {
    autenticar,
    autorizar
}
