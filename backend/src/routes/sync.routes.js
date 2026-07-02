const express = require("express")
const router = express.Router()

const syncController = require("../controllers/sync.controller")

router.get("/", syncController.obtenerCambios)

module.exports = router