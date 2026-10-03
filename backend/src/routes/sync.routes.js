const express = require("express")
const router = express.Router()

const syncController = require("../controllers/sync.controller")

router.get("/", syncController.obtenerCambios)
router.post("/push", syncController.aplicarCambios)

module.exports = router
