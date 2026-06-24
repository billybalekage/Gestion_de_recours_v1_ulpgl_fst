const express = require("express");
const {
  addPeriodeRecours,
  getAllPeriodes,
  getActivePeriodeForStudent,
} = require("../controller/periodeRecours.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles");

const periodeRecoursRouter = express.Router();

periodeRecoursRouter.post(
  "/add",
  verifyToken,
  authorizeRoles("admin"),
  addPeriodeRecours,
);

periodeRecoursRouter.get(
  "/all",
  verifyToken,
  authorizeRoles("admin"),
  getAllPeriodes,
);

periodeRecoursRouter.get(
  "/active", verifyToken, authorizeRoles("etudiant"),  
  getActivePeriodeForStudent,
);

module.exports = periodeRecoursRouter;
