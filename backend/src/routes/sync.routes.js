const express = require("express")
const { query } = require("express-validator")
const router = express.Router()

const syncController = require("../controllers/sync.controller")
const validationMiddleware = require("../middleware/validation.middleware")
const { MAX_PULL_LIMIT } = require("../constants/sync.constants")

const obtenerCambiosValidator = [

    query("last_change_id")
        .optional()
        .isInt({ min: 0 })
        .withMessage("last_change_id debe ser un entero mayor o igual a 0."),

    query("limit")
        .optional()
        .isInt({ min: 1, max: MAX_PULL_LIMIT })
        .withMessage(`limit debe ser un entero entre 1 y ${MAX_PULL_LIMIT}.`)

]

router.get("/", obtenerCambiosValidator, validationMiddleware, syncController.obtenerCambios)
router.post("/push", syncController.aplicarCambios)

module.exports = router
