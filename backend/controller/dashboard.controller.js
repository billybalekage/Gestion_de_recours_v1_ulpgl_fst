const db = require("../db/db");

const getAdminDashboard = async (req, res) => {
  try {
    const adminPromise = req.user?.userId
      ? db.query("SELECT id, name, email FROM users WHERE id = $1", [
          req.user.userId,
        ])
      : Promise.resolve({ rows: [] });

    const [statsResult, recentResult, adminResult] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM etudiants) AS total_etudiants,
          (SELECT COUNT(*)::int FROM cours) AS total_cours,
          (SELECT COUNT(*)::int FROM profs) AS total_profs,
          (SELECT COUNT(*)::int FROM recours) AS total_recours,
          (SELECT COUNT(*)::int FROM recours WHERE status IN ('accepte', 'refuse')) AS total_traites
      `),
      db.query(`
        SELECT
          r.id,
          r.status,
          r.created_at,
          r.objet,
          r.annee_universitaire,
          e.name || ' ' || e.postnom || ' ' || e.prenom AS etudiant_nom,
          e.matricule,
          e.promotion,
          e.department,
          (
            SELECT string_agg(DISTINCT c.title, ', ')
            FROM recours_cours rc
            JOIN cours c ON c.id = rc.course_id
            WHERE rc.recours_id = r.id
          ) AS cours_nom,
          (
            SELECT string_agg(DISTINCT rc.evaluation::text, ', ')
            FROM recours_cours rc
            WHERE rc.recours_id = r.id
          ) AS evaluation,
          (
            SELECT string_agg(DISTINCT (p.name || ' ' || p.postnom), ', ')
            FROM recours_cours rc
            JOIN cours c ON c.id = rc.course_id
            JOIN profs p ON p.id = c.professor_id
            WHERE rc.recours_id = r.id
          ) AS professeur_nom
        FROM recours r
        JOIN etudiants e ON e.id = r.etudiant_id
        ORDER BY r.created_at DESC
      `),
      adminPromise,
    ]);

    const stats = statsResult.rows[0] || {
      total_etudiants: 0,
      total_cours: 0,
      total_profs: 0,
      total_recours: 0,
      total_traites: 0,
    };

    res.json({
      ok: true,
      admin: adminResult.rows[0] || null,
      stats,
      recentRecours: recentResult.rows,
    });
  } catch (error) {
    console.error("Erreur dashboard admin:", error);
    res
      .status(500)
      .json({ ok: false, message: "Erreur serveur dashboard admin" });
  }
};

module.exports = { getAdminDashboard };
