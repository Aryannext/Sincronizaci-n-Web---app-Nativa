const express = require("express")
const { body } = require("express-validator")
const router = express.Router()


const personasController = require("../controllers/personas.controller")
const validationMiddleware = require("../middleware/validation.middleware")
const {
    crearPersonaValidator,
    actualizarPersonaValidator
} = require("../validators/persona.validator")

// version es opcional: si llega y no coincide, el servidor responde 409
const restaurarPersonaValidator = [
    body("version")
        .optional({ values: "null" })
        .isInt({ min: 1 })
        .withMessage("La versión debe ser un entero mayor o igual a 1.")
        .toInt()
]

router.get("/", personasController.obtenerPersonas)
// Antes de /:id, para que "eliminadas" no se interprete como un id
router.get("/eliminadas", personasController.obtenerPersonasEliminadas)
router.get("/:id", personasController.obtenerPersonaPorId)
router.post(
    "/",
    crearPersonaValidator,
    validationMiddleware,
    personasController.crearPersona
)
router.post(
    "/:id/restaurar",
    restaurarPersonaValidator,
    validationMiddleware,
    personasController.restaurarPersona
)
router.put(
    "/:id",
    actualizarPersonaValidator,
    validationMiddleware,
    personasController.actualizarPersona
)
router.delete("/:id", personasController.eliminarPersona)

module.exports = router
