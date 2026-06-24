const express = require("express");
const {
  addEtudiant,
  updateEtudiant,
  loginEtudiant,
  getAllEtudiants,
  getEtudiantById,
  getEtudiantByDepartement,
  getEtudiantByPromotion,
  logoutEtudiant,
  getMyEtudiantNameAndMatricule,
  getNumberOfEtudiants,
  deleteEtudiant,
} = require("../controller/etudiant.Controller");
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles");

const etudiantRoutes = express.Router();

etudiantRoutes.post("/add", verifyToken, authorizeRoles("admin"), addEtudiant);
etudiantRoutes.put(
  "/update/:id",
  verifyToken,
  authorizeRoles("admin"),
  updateEtudiant,
);
etudiantRoutes.delete(
  "/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteEtudiant,
);

etudiantRoutes.post("/login", loginEtudiant);
etudiantRoutes.post("/logout", verifyToken, logoutEtudiant);
etudiantRoutes.get(
  "/getAllEtudiants",
  verifyToken,
  authorizeRoles("admin"),
  getAllEtudiants,
);
etudiantRoutes.get(
  "/getEtudiantById/:id",
  verifyToken,
  authorizeRoles("admin"),
  getEtudiantById,
);
etudiantRoutes.get(
  "/getEtudiantByDepartement/:department",
  verifyToken,
  authorizeRoles("admin"),
  getEtudiantByDepartement,
);
etudiantRoutes.get(
  "/getEtudiantByPromotion/:promotion",
  verifyToken,
  authorizeRoles("admin"),
  getEtudiantByPromotion,
);
etudiantRoutes.get(
  "/etudiant/name-matricule",
  verifyToken,
  getMyEtudiantNameAndMatricule,
);

etudiantRoutes.get(
  "/number",
  verifyToken,
  authorizeRoles("admin"),
  getNumberOfEtudiants,
);

module.exports = etudiantRoutes;
