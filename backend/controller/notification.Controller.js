const db = require("../db/db");

const getNotifications = async (req, res) => {
  const userId = req.user?.userId || req.user?.id || null;

  if (!userId) {
    return res.status(401).json({ error: "Étudiant non authentifié." });
  }

  try {
    // 1. Récupération du profil de l'étudiant via user_id du token
    const etudiantResult = await db.query(
      "SELECT id, name, postnom, matricule, promotion, department, email FROM etudiants WHERE user_id = $1",
      [userId],
    );
    if (etudiantResult.rows.length === 0) {
      return res.status(404).json({ message: "Étudiant introuvable." });
    }

    const etudiant = etudiantResult.rows[0];
    const etudiant_id = etudiant.id;
    const { promotion, department } = etudiant;

    // 2. Récupération des périodes de recours destinées à sa section
    // On retire le filtre strict de la date du jour pour qu'il voie la notification de la création,
    // mais on trie par nouveauté (les plus récentes en premier)
    const periodesQuery = `
      SELECT p.*,
             p.department,
             COALESCE(
               JSON_AGG(JSON_BUILD_OBJECT('id', c.id, 'title', c.title)) FILTER (WHERE c.id IS NOT NULL),
               '[]'::json
             ) AS cours_concernes
      FROM periode_recours p
      LEFT JOIN periode_cours pc ON p.id = pc.periode_id
      LEFT JOIN cours c ON pc.course_id = c.id
      JOIN configuration cfg ON p.annee_universitaire = cfg.annee_universitaire_active
      WHERE cfg.est_active = TRUE
        AND p.promotion::text ILIKE $1
        AND p.department ILIKE $2
        AND p.date_debut <= CURRENT_DATE
        AND p.date_fin >= CURRENT_DATE
      GROUP BY p.id
      ORDER BY p.created_at DESC;
    `;

    const periodesResult = await db.query(periodesQuery, [
      promotion,
      department,
    ]);

    // 3. Récupération des réponses de l'administration à ses propres recours
    const traitementsQuery = `
      SELECT t.*, r.objet,
             (SELECT c.title FROM recours_cours rc JOIN cours c ON c.id = rc.course_id WHERE rc.recours_id = r.id LIMIT 1) AS cours_nom
      FROM traitement_recours t
      JOIN recours r ON t.recours_id = r.id
      WHERE r.etudiant_id = $1
        AND COALESCE(t.is_published, FALSE) = TRUE
      ORDER BY t.created_at DESC;
    `;

    const traitementsResult = await db.query(traitementsQuery, [etudiant_id]);

    // 4.b Récupération des notifications explicites stockées
    const notificationsQuery = `
      SELECT id, traitement_id, message, is_read, created_at
      FROM notifications
      WHERE etudiant_id = $1
      ORDER BY created_at DESC;
    `;
    const notificationsResult = await db.query(notificationsQuery, [
      etudiant_id,
    ]);

    // 5. Envoi de la réponse structurée au Front-end
    return res.status(200).json({
      etudiant: {
        ...etudiant,
        nom: etudiant.name || "",
        prenom: etudiant.postnom || "",
        fullname: `${etudiant.name || ""} ${etudiant.postnom || ""}`.trim(),
      },
      periodes: periodesResult.rows,
      traitements: traitementsResult.rows,
      notifications: notificationsResult.rows,
    });
  } catch (error) {
    console.error("Erreur notifications backend:", error);
    return res
      .status(500)
      .json({ error: "Erreur lors du chargement des notifications." });
  }
};

module.exports = getNotifications;
