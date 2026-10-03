const AppError = require("../errors/AppError")

// Errores de PostgreSQL causados por la petición del cliente (se responden con 4xx más abajo)
const CODIGOS_PG_DEL_CLIENTE = new Set(["23505", "23503", "22P02"])

const errorMiddleware = (error, req, res, next) => {

    // Los errores esperados (401, 403, 404, validación...) no se registran con traza:
    // bajo un ataque llenarían los logs sin aportar nada
    const esperado =
        (error instanceof AppError && error.statusCode < 500) ||
        CODIGOS_PG_DEL_CLIENTE.has(error.code)

    if (!esperado && !error.type) {
        console.error(error)
    }

    if (error instanceof AppError) {

        return res.status(error.statusCode).json({

            success: false,

            message: error.message,

            ...(error.data !== undefined && { data: error.data })

        })

    }

    // Errores del lector de JSON de Express (cuerpo mal formado o demasiado grande)
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "El cuerpo de la petición no es un JSON válido." })
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({ success: false, message: "El cuerpo de la petición es demasiado grande." })
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