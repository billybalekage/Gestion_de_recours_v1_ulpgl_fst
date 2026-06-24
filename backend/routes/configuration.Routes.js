const express = require("express")
const {verifyToken, authorizeRoles} = require("../middlewares/authAndRoles")
const { createConfiguration, updateConfiguration, getAllConfigurations, getActiveConfiguration, deleteConfiguration } = require("../controller/configuration.controller")

const configRouter = express.Router()

configRouter.post("/add-config", verifyToken, authorizeRoles('admin'), createConfiguration ) // ajouter une configuration
configRouter.put("/update/:id", verifyToken, authorizeRoles('admin'),  updateConfiguration) // mettre a jour une configuration
configRouter.get("/:id", verifyToken, authorizeRoles('admin'),  getAllConfigurations) // get toutes les configuration
configRouter.get("/active", verifyToken, authorizeRoles('admin'),  getActiveConfiguration) // recuperer les configuration active
configRouter.delete("/delete/:id", verifyToken, authorizeRoles('admin'), deleteConfiguration) // supprimer une configuration

module.exports = configRouter