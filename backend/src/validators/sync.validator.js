const { body, validationResult } = require("express-validator")
const { crearPersonaValidator } = require("./persona.validator")
const { SYNC_OPERATIONS } = require("../constants/sync.constants")

const uuidValidator = body("uuid")
    .isUUID()
    .withMessage("El uuid no es válido.")

const baseVersionValidator = body("base_version")
    .isInt({ min: 1 })
    .withMessage("base_version debe ser un entero mayor o igual a 1.")
    .toInt()

const VALIDADORES_POR_OPERACION = {
    [SYNC_OPERATIONS.CREATE]: [uuidValidator, ...crearPersonaValidator],
    [SYNC_OPERATIONS.UPDATE]: [uuidValidator, baseVersionValidator, ...crearPersonaValidator],
    [SYNC_OPERATIONS.DELETE]: [uuidValidator, baseVersionValidator]
}

const esObjeto = (valor) =>
    typeof valor === "object" && valor !== null && !Array.isArray(valor)

const errorUnico = (campo, mensaje) => ({
    valida: false,
    errores: [{ campo, mensaje }]
})

// Valida una operación del lote y devuelve sus datos ya saneados
// (mismas reglas que POST/PUT de /api/personas, incluido normalizeEmail)
const validarOperacion = async (operacion) => {

    if (!esObjeto(operacion)) {
        return errorUnico("operation", "Cada operación debe ser un objeto.")
    }

    const { op, uuid, base_version, data } = operacion
    const validadores = VALIDADORES_POR_OPERACION[op]

    if (!validadores) {
        return errorUnico("op", "op debe ser CREATE, UPDATE o DELETE.")
    }

    const llevaDatos = op !== SYNC_OPERATIONS.DELETE

    if (llevaDatos && !esObjeto(data)) {
        return errorUnico("data", "data es obligatorio y debe ser un objeto.")
    }

    // express-validator trabaja sobre req.body, así que se arma uno por operación
    const req = {
        body: {
            ...(llevaDatos ? data : {}),
            uuid,
            base_version
        }
    }

    for (const validador of validadores) {
        await validador.run(req)
    }

    const errores = validationResult(req)

    if (!errores.isEmpty()) {
        return {
            valida: false,
            errores: errores.array().map(error => ({
                campo: error.path,
                mensaje: error.msg
            }))
        }
    }

    return {
        valida: true,
        operacion: {
            op,
            uuid: req.body.uuid,
            base_version: req.body.base_version,
            data: llevaDatos
                ? {
                    nombre: req.body.nombre,
                    apellido: req.body.apellido,
                    telefono: req.body.telefono,
                    correo: req.body.correo
                }
                : null
        }
    }

}

module.exports = {
    validarOperacion
}
