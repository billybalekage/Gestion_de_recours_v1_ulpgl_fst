const express = require("express");
const {
  addCours,
  updateCours,
  getCoursBydepartmentAndPromotion,
  getAllCours,
  getCoursByEtudiant,
  getCoursById,
  getNumberOfCours,
  deleteCours,
  getCoursByPeriode,
} = require("../controller/cours.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles");

const coursRouter = express.Router();

coursRouter.post("/add", verifyToken, authorizeRoles("admin"), addCours);
coursRouter.get(
  "/admin-list",
  verifyToken,
  authorizeRoles("admin"),
  getAllCours,
);
coursRouter.get(
  "/mes-cours",
  verifyToken,
  authorizeRoles("etudiant"),
  getCoursBydepartmentAndPromotion,
);
coursRouter.put(
  "/update/:id",
  verifyToken,
  authorizeRoles("admin"),  
  updateCours,
);
coursRouter.delete(
  "/delete/:id",
  verifyToken,
  authorizeRoles("admin"),
  deleteCours,
);
coursRouter.get(
  "/count",
  verifyToken,
  authorizeRoles("admin"),
  getNumberOfCours,
);
coursRouter.get("/:id", verifyToken, authorizeRoles("admin"), getCoursById);

coursRouter.get(
  "/etudiant-cours/:matricule",
  verifyToken,
  authorizeRoles("admin", "enseignant"),
  getCoursByEtudiant,
);

coursRouter.get(
  "/periode/:periodeId",
  verifyToken,
  authorizeRoles("admin", "enseignant", "etudiant"),
  getCoursByPeriode,
);

module.exports = coursRouter;
