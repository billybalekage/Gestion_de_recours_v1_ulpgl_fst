const express = require("express")
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles")
const getNotifications = require("../controller/notification.Controller")

const notificationRouter = express.Router()

console.log("=== VÉRIFICATION DES IMPORTS ===");
console.log("verifyToken:", typeof verifyToken, verifyToken);
console.log("authorizeRoles:", typeof authorizeRoles, authorizeRoles);
console.log("getNotifications:", typeof getNotifications, getNotifications);

notificationRouter.get(
  "/get-notification",
  verifyToken,
  authorizeRoles("etudiant"),
  getNotifications,
);

module.exports = notificationRouter;