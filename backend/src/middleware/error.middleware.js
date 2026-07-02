const AppError = require("../errors/AppError")

const errorMiddleware = (error, req, res, next) => {

    console.error(error)

    if (error instanceof AppError) {

        return res.status(error.statusCode).json({

            success: false,

            message: error.message

        })

    }

    switch (error.code) {

        case "23505":
            return res.status(409).json({

                success: false,

                message: "El correo ya está registrado."

            })

        case "23503":
            return res.status(409).json({

                success: false,

                message: "No es posible realizar la operación porque existen registros relacionados."

            })

        case "22P02":
            return res.status(400).json({

                success: false,

                message: "Formato de dato inválido."

            })

        default:

            return res.status(500).json({

                success: false,

                message: "Error interno del servidor."

            })

    }

}

module.exports = errorMiddleware