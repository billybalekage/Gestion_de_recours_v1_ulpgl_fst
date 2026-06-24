const express = require("express");
const {
  addProf,
  updateProf,
  getAllProfs,
  getProfById,
  getNumberOfProfs,
  getProfCountByDepartment,
  deleteProf,
  getStudentsForProfessor,
  getProfessorDashboard,
  getStudentDetailsForProfessor,
  loginProfs,
} = require("../controller/profs.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/authAndRoles");

const profRoute = express.Router();

// Public login for professors
profRoute.post("/login", loginProfs);

profRoute.post("/add", verifyToken, authorizeRoles("admin"), addProf);
profRoute.put("/update/:id", verifyToken, authorizeRoles("admin"), updateProf);
profRoute.delete("/:id", verifyToken, authorizeRoles("admin"), deleteProf);

profRoute.get(
  "/dashboard",
  verifyToken,
  authorizeRoles("enseignant"),
  getProfessorDashboard,
);
profRoute.get(
  "/students",
  verifyToken,
  authorizeRoles("enseignant"),
  getStudentsForProfessor,
);
profRoute.get(
  "/student/:matricule",
  verifyToken,
  authorizeRoles("enseignant"),
  getStudentDetailsForProfessor,
);

profRoute.get("/count", verifyToken, authorizeRoles("admin"), getNumberOfProfs);
profRoute.get(
  "/count-by-department",
  verifyToken,
  authorizeRoles("admin"),
  getProfCountByDepartment,
);
profRoute.get("/admin-list", verifyToken, authorizeRoles("admin"), getAllProfs);
profRoute.get("/:id", verifyToken, authorizeRoles("admin"), getProfById);

module.exports = profRoute;
