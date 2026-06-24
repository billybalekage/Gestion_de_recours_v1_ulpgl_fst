const express = require("express");
const upload = require("../utils/multer");
const {
  addRecours,
  getNumberOfRecoursEtudiant,
  getRecentRecoursEtudiant,
  getAllRecoursEtudiant,
  getAllRecoursAdmin,
  getRecoursForProfessor,
  adminSendToProfessor,
  adminInvalidateRecours,
  getRecoursAttachment,
} = require("../controller/recours.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles");


console.log("Tentative de chargement du routeur de recours...");
const recoursRouter = express.Router();

// Student routes
recoursRouter.post(
  "/add-recours",
  verifyToken,
  authorizeRoles("etudiant"),
  upload.any(),
  addRecours,
);
recoursRouter.get("/my-recours-number", verifyToken, getNumberOfRecoursEtudiant);
recoursRouter.get("/my-recent-recours", verifyToken, getRecentRecoursEtudiant);
recoursRouter.get("/my-all-recours", verifyToken, getAllRecoursEtudiant);

// Professor routes
recoursRouter.get(
  "/prof/my-recours",
  verifyToken,
  authorizeRoles("enseignant"),
  getRecoursForProfessor,
);

console.log("--> Route /api/recours/prof/my-recours initialisée avec succès !");

// Admin routes
recoursRouter.get(
  "/admin-list",
  verifyToken,
  authorizeRoles("admin"),
  getAllRecoursAdmin,
);
recoursRouter.post(
  "/admin/send-to-prof/:id",
  verifyToken,
  authorizeRoles("admin"),
  adminSendToProfessor,
);
recoursRouter.post(
  "/admin/invalidate/:id",
  verifyToken,
  authorizeRoles("admin"),
  adminInvalidateRecours,
);

// Serve attachment (admin and prof can view)
recoursRouter.get(
  "/attachment/:recoursCourId",
  verifyToken,
  authorizeRoles("admin", "enseignant"),
  getRecoursAttachment,
);

module.exports = recoursRouter;
