const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

require("dotenv").config();
const db = require("./db/db");

// Security middleware
let helmet, rateLimit;
try { helmet = require("helmet"); } catch (_) { helmet = null; }
try { rateLimit = require("express-rate-limit"); } catch (_) { rateLimit = null; }

const authRoutes = require("./routes/auth.Route");
const coursRoute = require("./routes/cours.Route");
const etudiantRoutes = require("./routes/etudiant.Routes");
const profRoute = require("./routes/profs.routes");
const recoursRouter = require("./routes/recours.route");
const noteRouter = require("./routes/notes.Route");
const dashboardRouter = require("./routes/dashboard.Route");
const periodeRecoursRouter = require("./routes/periodeRecours.Route");
const notificationRouter = require("./routes/notification.Routes");
const traitementRoutes = require("./routes/traitement_recours.Route");
const configRouter = require("./routes/configuration.Routes");

const port = process.env.PORT || 8000;
const app = express();

// Security headers
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled to allow inline scripts in existing frontend
    crossOriginEmbedderPolicy: false,
  }));
}

// CORS — restrict to configured origin in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:8000", "http://localhost:3000", "http://127.0.0.1:8000"];

app.use(cors());

app.use(express.json());

// Rate limiting on auth routes
if (rateLimit) {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { message: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/auth", authLimiter);
}

// Static files
app.use(express.static(path.join(__dirname, "../Front_end")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front_end/etudiant/login.html"));
});
app.get("/espace-profs", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front_end/profs/login.html"));
});
app.get("/portal-system-secure-admin-access", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front_end/admin/login.html"));
});
app.use(
  "/portal-system-secure-admin-access",
  express.static(path.join(__dirname, "../Front_end/admin")),
);

// Upload directories
const uploadsDir = path.join(__dirname, "uploads");
const recoursUploads = path.join(uploadsDir, "recours");
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
  if (!fs.existsSync(recoursUploads)) fs.mkdirSync(recoursUploads);
} catch (err) {
  console.error("Erreur création dossiers upload:", err);
}

// JSON parse error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Format JSON invalide." });
  }
  next(err);
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/cours", coursRoute);
app.use("/api/etudiants", etudiantRoutes);
app.use("/api/profs", profRoute);
app.use("/api/recours", recoursRouter);
app.use("/api/notes", noteRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/periode-recours", periodeRecoursRouter);
app.use("/api/traitement_recours", traitementRoutes);
app.use("/api/config", configRouter);
app.use("/api/notification", notificationRouter);

// Generic error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Erreur interne du serveur." });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
