const express = require("express");
const {
  addNote,
  getMyNotes,
  getNotesByMatriculeForAdmin,
} = require("../controller/notes.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles");

noteRouter = express.Router();
noteRouter.post(
  "/add-note",
  verifyToken,
  authorizeRoles("admin", "enseignant"),
  addNote,
);
// Alias attendu par les pages admin / prof : POST /api/notes/add
noteRouter.post(
  "/add",
  verifyToken,
  authorizeRoles("admin", "enseignant"),
  addNote,
);
// Modification d'une note (addNote fait un upsert via ON CONFLICT) : PUT /api/notes/update
noteRouter.put(
  "/update",
  verifyToken,
  authorizeRoles("admin", "enseignant"),
  addNote,
);
noteRouter.get(
  "/admin/matricule/:matricule",
  verifyToken,
  authorizeRoles("admin", "enseignant"),
  getNotesByMatriculeForAdmin,
);
noteRouter.get(
  "/my-notes",
  verifyToken,
  authorizeRoles("etudiant"),
  getMyNotes,
); // Ajout de la route pour récupérer les notes de l'étudiant connecté

module.exports = noteRouter;
