const express = require("express");
const {
  addTraitementRecous,
  addTraitementByProf,
  getPendingTraitementsForAdmin,
  publishTraitement,
} = require("../controller/traitement_recours.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles");

const traitementRoutes = express.Router();

// Prof submits treatment for a recours
traitementRoutes.post(
  "/prof/traiter",
  verifyToken,
  authorizeRoles("enseignant"),
  addTraitementByProf,
);

// Legacy: admin or prof treatment (backward compat)
traitementRoutes.post(
  "/traitement_recours",
  verifyToken,
  authorizeRoles("enseignant", "admin"),
  addTraitementRecous,
);

// Admin: list treatments from prof awaiting publication
traitementRoutes.get(
  "/admin/pending",
  verifyToken,
  authorizeRoles("admin"),
  getPendingTraitementsForAdmin,
);

// Admin: publish treatment to student
traitementRoutes.post(
  "/publish/:id",
  verifyToken,
  authorizeRoles("admin"),
  publishTraitement,
);

module.exports = traitementRoutes;
