const express = require("express")
const router = express.Router()


const personasController = require("../controllers/personas.controller")
const validationMiddleware = require("../middleware/validation.middleware")
const {
    crearPersonaValidator
} = require("../validators/persona.validator")

router.get("/", personasController.obtenerPersonas)
router.get("/:id", personasController.obtenerPersonaPorId)
router.post(
    "/",
    crearPersonaValidator,
    validationMiddleware,
    personasController.crearPersona
)
router.put("/:id", personasController.actualizarPersona)
router.delete("/:id", personasController.eliminarPersona)

module.exports = router
