const { validationResult } = require("express-validator")

const validationMiddleware = (req, _res, next) => {

    const errores = validationResult(req)

    if (!errores.isEmpty()) {

        return _res.status(400).json({
            success: false,
            message: "Error de validación.",
            errors: errores.array().map(error => ({
                campo: error.path,
                mensaje: error.msg
            }))
        })

    }

    next()

}

module.exports = validationMiddleware