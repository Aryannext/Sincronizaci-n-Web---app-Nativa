const { body } = require("express-validator")

const crearPersonaValidator = [

    body("nombre")
        .trim()
        .notEmpty()
        .withMessage("El nombre es obligatorio.")
        .bail()
        .isLength({ min: 2, max: 100 })
        .withMessage("El nombre debe tener entre 2 y 100 caracteres."),

    body("apellido")
        .trim()
        .notEmpty()
        .withMessage("El apellido es obligatorio.")
        .bail()
        .isLength({ min: 2, max: 100 })
        .withMessage("El apellido debe tener entre 2 y 100 caracteres."),

    body("telefono")
        .trim()
        .notEmpty()
        .withMessage("El teléfono es obligatorio.")
        .bail()
        .isLength({ min: 7, max: 20 })
        .withMessage("El teléfono debe tener entre 7 y 20 caracteres."),

    body("correo")
        .trim()
        .notEmpty()
        .withMessage("El correo es obligatorio.")
        .bail()
        .isEmail()
        .withMessage("El correo no es válido.")
        .normalizeEmail()

]

module.exports = {
    crearPersonaValidator
}