const { body } = require("express-validator")

const loginValidator = [

    body("correo")
        .trim()
        .notEmpty()
        .withMessage("El correo es obligatorio.")
        .bail()
        .isEmail()
        .withMessage("El correo no es válido."),

    body("password")
        .isString()
        .withMessage("La contraseña es obligatoria.")
        .bail()
        .notEmpty()
        .withMessage("La contraseña es obligatoria.")
        .isLength({ max: 200 })
        .withMessage("La contraseña es demasiado larga.")

]

module.exports = {
    loginValidator
}
