const express = require("express")
const router = express.Router()

const authController = require("../controllers/auth.controller")
const validationMiddleware = require("../middleware/validation.middleware")
const { autenticar } = require("../middleware/auth.middleware")
const { loginLimiter } = require("../middleware/rateLimit.middleware")
const { loginValidator } = require("../validators/auth.validator")

router.post(
    "/login",
    loginLimiter,
    loginValidator,
    validationMiddleware,
    authController.iniciarSesion
)

router.get("/me", autenticar, authController.obtenerUsuarioActual)

module.exports = router
