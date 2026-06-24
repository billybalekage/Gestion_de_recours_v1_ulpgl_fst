const db = require("../db/db");

/**
 * Step 3 — Prof submits treatment for a recours
 * Sets status to 'traite_prof', records decision for admin to review
 */
const addTraitementByProf = async (req, res) => {
  const { recours_id, recours_cours_id, decision, motif } = req.body;
  const userId = req.user && req.user.userId;
  const validDecisions = ["accepte", "refuse"];

  if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié." });
  if (!recours_id || !decision || !motif) {
    return res.status(400).json({ message: "recours_id, decision et motif sont requis." });
  }
  if (!validDecisions.includes(decision)) {
    return res.status(400).json({ message: "La décision doit être 'accepte' ou 'refuse'." });
  }

  try {
    // Get prof profile
    const profResult = await db.query("SELECT id FROM profs WHERE id = $1", [userId]);
    if (profResult.rows.length === 0) {
      return res.status(404).json({ message: "Profil professeur introuvable." });
    }
    const profId = profResult.rows[0].id;

    const recoursResult = await db.query(
      `SELECT r.id, r.status FROM recours r WHERE r.id = $1`,
      [recours_id],
    );
    if (recoursResult.rows.length === 0) return res.status(404).json({ message: "Recours introuvable." });

    const recoursData = recoursResult.rows[0];
    if (!["en_attente", "en_cours"].includes(recoursData.status)) {
      return res.status(400).json({ message: "Ce recours a déjà été traité." });
    }

    // Find which admin sent this recours (to know who to notify)
    const adminResult = await db.query(
      `SELECT admin_id FROM traitement_recours WHERE recours_id = $1 AND admin_id IS NOT NULL LIMIT 1`,
      [recours_id],
    );
    const adminId = adminResult.rows[0]?.admin_id || null;

    await db.query("BEGIN");

    const traitementInsert = await db.query(
      `INSERT INTO traitement_recours
         (recours_id, recours_cours_id, professeur_id, admin_id, decision, motif, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       RETURNING id`,
      [recours_id, recours_cours_id || null, profId, adminId, decision, motif],
    );

    // Update recours status to 'traite_prof' (awaiting admin publication)
    await db.query("UPDATE recours SET status = 'traite_prof' WHERE id = $1", [recours_id]);

    await db.query("COMMIT");

    return res.status(201).json({
      message: "Traitement du recours enregistré. En attente de publication par l'administration.",
      traitement_id: traitementInsert.rows[0].id,
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Erreur addTraitementByProf:", error);
    return res.status(500).json({ message: "Erreur lors du traitement du recours." });
  }
};

/**
 * Backward-compatible: admin or prof creates treatment (legacy route)
 */
const addTraitementRecous = async (req, res) => {
  const userRole = req.user && req.user.role;
  if (userRole === "enseignant") return addTraitementByProf(req, res);

  // Admin direct treatment
  const { recours_id, decision, motif } = req.body;
  const userId = req.user && req.user.userId;
  const validDecisions = ["accepte", "refuse"];

  if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié." });
  if (!recours_id || !decision || !motif) {
    return res.status(400).json({ message: "recours_id, decision et motif sont requis." });
  }
  if (!validDecisions.includes(decision)) {
    return res.status(400).json({ message: "La décision doit être 'accepte' ou 'refuse'." });
  }

  try {
    const recoursResult = await db.query("SELECT id, status FROM recours WHERE id = $1", [recours_id]);
    if (recoursResult.rows.length === 0) return res.status(404).json({ message: "Recours introuvable." });

    await db.query("BEGIN");
    const insert = await db.query(
      `INSERT INTO traitement_recours (recours_id, decision, motif, userId, is_published)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id`,
      [recours_id, decision, motif, userId],
    );
    await db.query("UPDATE recours SET status = $1 WHERE id = $2", [decision, recours_id]);
    await db.query("COMMIT");

    return res.status(201).json({
      message: "Le recours a bien été traité.",
      traitement_id: insert.rows[0].id,
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Erreur addTraitementRecous:", error);
    return res.status(500).json({ message: "Erreur lors du traitement du recours." });
  }
};

/**
 * Step 4 — Admin: list treatments returned by prof (status=traite_prof, not yet published)
 */
const getPendingTraitementsForAdmin = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         t.id, t.recours_id, t.recours_cours_id, t.professeur_id, t.admin_id,
         t.decision, t.motif, t.is_published, t.created_at,
         r.objet, r.status AS recours_status,
         rc.evaluation, rc.piece_jointe,
         c.title AS cours_nom,
         e.matricule, e.name AS etudiant_name, e.postnom AS etudiant_postnom,
         p.name AS prof_name, p.postnom AS prof_postnom
       FROM traitement_recours t
       JOIN recours r ON t.recours_id = r.id
       LEFT JOIN recours_cours rc ON t.recours_cours_id = rc.id
       LEFT JOIN cours c ON rc.course_id = c.id
       JOIN etudiants e ON r.etudiant_id = e.id
       LEFT JOIN profs p ON t.professeur_id = p.id
       WHERE COALESCE(t.is_published, FALSE) = FALSE
         AND t.decision IN ('accepte', 'refuse')
         AND t.professeur_id IS NOT NULL
       ORDER BY t.created_at DESC`,
    );

    return res.json({ traitements: result.rows });
  } catch (error) {
    console.error("Erreur getPendingTraitementsForAdmin:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Step 4 — Admin: publish treatment to student
 * Updates recours status to 'publie' and creates notification
 */
const publishTraitement = async (req, res) => {
  const traitementId = req.params.id;
  const userId = req.user && req.user.userId;

  if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié." });

  try {
    await db.query("BEGIN");

    const update = await db.query(
      `UPDATE traitement_recours SET is_published = TRUE WHERE id = $1 RETURNING *`,
      [traitementId],
    );
    if (update.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Traitement introuvable." });
    }

    const traitement = update.rows[0];

    // Update recours status based on decision
    await db.query(
      `UPDATE recours SET status = $1 WHERE id = $2`,
      [traitement.decision, traitement.recours_id],
    );

    await db.query("COMMIT");

    // Create notification for student (non-blocking)
    try {
      const detailRes = await db.query(
        `SELECT
           t.id AS traitement_id, t.decision,
           r.id AS recours_id, r.objet, r.etudiant_id,
           c.title AS cours_nom,
           e.name AS etudiant_name
         FROM traitement_recours t
         JOIN recours r ON t.recours_id = r.id
         LEFT JOIN recours_cours rc ON t.recours_cours_id = rc.id
         LEFT JOIN cours c ON rc.course_id = c.id
         JOIN etudiants e ON r.etudiant_id = e.id
         WHERE t.id = $1`,
        [traitementId],
      );

      if (detailRes.rows.length > 0) {
        const d = detailRes.rows[0];
        const coursInfo = d.cours_nom ? ` pour le cours "${d.cours_nom}"` : "";
        const decisionLabel = d.decision === "accepte" ? "accepté" : "refusé";
        const message = `Votre recours "${d.objet || "recours"}"${coursInfo} a été ${decisionLabel}.`;
        await db.query(
          `INSERT INTO notifications (etudiant_id, traitement_id, message) VALUES ($1, $2, $3)`,
          [d.etudiant_id, traitementId, message],
        );
      }
    } catch (notifErr) {
      console.error("Erreur notification:", notifErr.message);
    }

    return res.json({ message: "Traitement publié et étudiant notifié.", traitement });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Erreur publishTraitement:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = {
  addTraitementRecous,
  addTraitementByProf,
  getPendingTraitementsForAdmin,
  publishTraitement,
};
