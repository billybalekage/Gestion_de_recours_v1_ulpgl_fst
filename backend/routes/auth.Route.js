const express = require("express");
const { login, register, logout, getNameAndEmail } = require("../controller/auth.Controller");
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles");

const authRouter = express.Router(); // Create a router for authentication-related routes

authRouter.post("/login", login); // Route pour authentification des administrateurs
authRouter.post("/register", register); // Route pour l'inscription des administrateurs
authRouter.post("/logout", verifyToken, logout); // Route pour la déconnexion des administrateurs
authRouter.get("/user-info", verifyToken, authorizeRoles("admin"), getNameAndEmail); // Route pour récupérer le nom et l'email de l'utilisateur connecté

module.exports = authRouter;
