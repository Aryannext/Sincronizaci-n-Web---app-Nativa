class AppError extends Error {

    // data es opcional: se envía al cliente junto al mensaje (ej. el registro actual en un 409)
    constructor(message, statusCode, data) {

        super(message)

        this.statusCode = statusCode

        this.data = data

        this.name = "AppError"

        Error.captureStackTrace(this, this.constructor)

    }

}

module.exports = AppError