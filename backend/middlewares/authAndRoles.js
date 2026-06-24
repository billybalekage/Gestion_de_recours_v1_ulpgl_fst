const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  // Also accept token from query param for file downloads (e.g. <a href="...?token=xxx">)
  const token = (authHeader && authHeader.split(" ")[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("[auth] verifyToken error:", error && error.message ? error.message : error);
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // verifier si l'utilisateur est authentifié et a un role
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "utilisateur non authentifié" });
    }

    // Si aucun rôle n'est fourni, on autorise simplement l'utilisateur authentifié.
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      console.warn(
        `[auth] authorizeRoles - accès refusé pour role=${req.user.role} required=${allowedRoles}`,
      );
      return res.status(403).json({ error: "Accès refusé: rôle insuffisant" });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles,
};
