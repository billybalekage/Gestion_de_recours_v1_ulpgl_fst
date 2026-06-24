const express = require("express");
const { getAdminDashboard } = require("../controller/dashboard.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles");

const dashboardRouter = express.Router();

dashboardRouter.get(
  "/admin",
  verifyToken,
  authorizeRoles("admin"),
  getAdminDashboard,
);

module.exports = dashboardRouter;
