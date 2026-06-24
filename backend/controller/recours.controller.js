const db = require("../db/db");
const path = require("path");

const normalizeEvaluation = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const map = {
    tp: "tp",
    td: "td",
    interrogation: "interrogation",
    interrogations: "interrogation",
    examen: "examen",
  };

  return map[normalized] || null;
};

/**
 * Step 1 — Student submits a recours (multi-course, multi-evaluation)
 * etudiant_id comes from JWT token, NOT manual input
 * piece_jointe is MANDATORY for tp/td/interrogation, optional for examen
 */
const addRecours = async (req, res) => {
  try {
    const { objet, annee, description } = req.body;
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: "Utilisateur non authentifié." });

    if (!objet || !annee || !description) {
      return res.status(400).json({
        error: "Les champs objet, année et description sont obligatoires.",
      });
    }

    // Resolve etudiant id from user_id in token
    const etudiantResult = await db.query(
      "SELECT id FROM etudiants WHERE user_id = $1",
      [userId],
    );
    if (etudiantResult.rows.length === 0) {
      return res.status(404).json({ error: "Profil étudiant introuvable." });
    }
    const etudiant_id = etudiantResult.rows[0].id;

    if (!req.body.activeIndexes) {
      return res.status(400).json({ error: "Vous devez ajouter au moins un cours concerné." });
    }

    // Verify active recours period
    const tzo = new Date().getTimezoneOffset() * 60000;
    const dateActuelle = new Date(Date.now() - tzo).toISOString().slice(0, 10);

    const periodeActiveResult = await db.query(
      `SELECT id FROM periode_recours
       WHERE annee_universitaire = $1
         AND date_debut <= $2
         AND date_fin >= $2
       LIMIT 1`,
      [annee, dateActuelle],
    );

    if (periodeActiveResult.rows.length === 0) {
      return res.status(400).json({
        error: `Aucune période de recours n'est active pour l'année universitaire ${annee}.`,
      });
    }

    const activePeriodeId = periodeActiveResult.rows[0].id;

    let activeIndexes;
    try {
      activeIndexes = JSON.parse(req.body.activeIndexes);
    } catch (_) {
      return res.status(400).json({ error: "Format activeIndexes invalide." });
    }

    const lignesAInserer = [];

    for (const index of activeIndexes) {
      const course_id_raw = req.body[`cours_${index}`];
      let evaluations = [];
      try {
        evaluations = JSON.parse(req.body[`eval_${index}`] || "[]");
      } catch (_) {
        evaluations = [];
      }

      const normalizedEvaluations = evaluations
        .map(normalizeEvaluation)
        .filter(Boolean);

      if (!course_id_raw || normalizedEvaluations.length === 0) continue;

      let course_id;
      if (isNaN(parseInt(course_id_raw, 10))) {
        const found = await db.query(
          "SELECT id FROM cours WHERE title ILIKE $1 LIMIT 1",
          [`%${course_id_raw}%`],
        );
        if (found.rows.length === 0) {
          return res.status(400).json({ error: `Cours '${course_id_raw}' introuvable.` });
        }
        course_id = found.rows[0].id;
      } else {
        course_id = parseInt(course_id_raw, 10);
      }

      // Verify course belongs to the active period
      const coursAssocieResult = await db.query(
        `SELECT 1 FROM periode_cours WHERE periode_id = $1 AND course_id = $2`,
        [activePeriodeId, course_id],
      );
      if (coursAssocieResult.rows.length === 0) {
        return res.status(400).json({
          error: `Le cours sélectionné n'est pas associé à la période de recours active.`,
        });
      }

      // Get file for this course block (one file per cours block)
      const fichier = req.files && req.files.find((f) => f.fieldname === `attachments_${index}`);
      const cheminPieceJointe = fichier ? fichier.path : null;

      for (const typeEval of normalizedEvaluations) {
        // Piece jointe MANDATORY for tp, td, interrogation
        if (["tp", "td", "interrogation"].includes(typeEval) && !cheminPieceJointe) {
          return res.status(400).json({
            error: `La pièce justificative est obligatoire pour le type d'évaluation "${typeEval}".`,
          });
        }
        lignesAInserer.push({ course_id, evaluation: typeEval, piece_jointe: cheminPieceJointe });
      }
    }

    if (lignesAInserer.length === 0) {
      return res.status(400).json({
        error: "Aucun cours ou type d'évaluation valide n'a été sélectionné.",
      });
    }

    await db.query("BEGIN");

    // One recours record for this submission
    const recoursResult = await db.query(
      `INSERT INTO recours (objet, description, annee_universitaire, etudiant_id, status)
       VALUES ($1, $2, $3, $4, 'en_attente')
       RETURNING id`,
      [objet, description, annee, etudiant_id],
    );
    const recours_id = recoursResult.rows[0].id;

    // Insert each course+evaluation line into recours_cours
    for (const ligne of lignesAInserer) {
      await db.query(
        `INSERT INTO recours_cours (recours_id, course_id, evaluation, piece_jointe)
         VALUES ($1, $2, $3, $4)`,
        [recours_id, ligne.course_id, ligne.evaluation, ligne.piece_jointe],
      );
    }

    await db.query("COMMIT");

    return res.status(201).json({
      message: "Votre recours a bien été enregistré.",
      recours_id,
      nombre_cours: lignesAInserer.length,
    });
  } catch (error) {
    try { await db.query("ROLLBACK"); } catch (_) {}
    console.error("Erreur insertion recours:", error);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement du recours." });
  }
};

const getNumberOfRecoursEtudiant = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié" });

  try {
    const result = await db.query(
      `SELECT COUNT(r.*)::int AS total
       FROM recours r
       JOIN etudiants e ON e.id = r.etudiant_id
       WHERE e.user_id = $1`,
      [userId],
    );
    return res.json({ total: result.rows[0]?.total ?? 0 });
  } catch (error) {
    console.error("Erreur getNumberOfRecoursEtudiant:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const getRecentRecoursEtudiant = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié" });

  try {
    const result = await db.query(
      `SELECT
         r.id,
         r.objet,
         r.description,
         r.status,
         r.annee_universitaire,
         r.created_at,
         (
           SELECT json_agg(json_build_object(
             'recours_cours_id', rc.id,
             'course_id', rc.course_id,
             'course_name', c.title,
             'evaluation', rc.evaluation,
             'piece_jointe', rc.piece_jointe
           ))
           FROM recours_cours rc
           JOIN cours c ON c.id = rc.course_id
           WHERE rc.recours_id = r.id
         ) AS cours_list
       FROM recours r
       JOIN etudiants e ON e.id = r.etudiant_id
       WHERE e.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT 8`,
      [userId],
    );

    const stats = await db.query(
      `SELECT
         COUNT(r.*)::int AS total,
         COUNT(r.*) FILTER (WHERE r.status = 'en_attente')::int AS pending,
         COUNT(r.*) FILTER (WHERE r.status IN ('accepte','publie'))::int AS accepted,
         COUNT(r.*) FILTER (WHERE r.status = 'refuse')::int AS refused
       FROM recours r
       JOIN etudiants e ON e.id = r.etudiant_id
       WHERE e.user_id = $1`,
      [userId],
    );

    return res.json({ recours: result.rows, ...stats.rows[0] });
  } catch (error) {
    console.error("Erreur getRecentRecoursEtudiant:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const getAllRecoursEtudiant = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié" });

  try {
    const result = await db.query(
      `SELECT
         r.id,
         r.objet,
         r.description,
         r.status,
         r.annee_universitaire,
         r.created_at,
         (
           SELECT json_agg(json_build_object(
             'recours_cours_id', rc.id,
             'course_id', rc.course_id,
             'course_name', c.title,
             'evaluation', rc.evaluation,
             'piece_jointe', rc.piece_jointe
           ))
           FROM recours_cours rc
           JOIN cours c ON c.id = rc.course_id
           WHERE rc.recours_id = r.id
         ) AS cours_list
       FROM recours r
       JOIN etudiants e ON e.id = r.etudiant_id
       WHERE e.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId],
    );

    return res.json({ recours: result.rows });
  } catch (error) {
    console.error("Erreur getAllRecoursEtudiant:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Step 2 — Admin: list all recours with course details
 */
const getAllRecoursAdmin = async (req, res) => {
  try {
    const department = (req.query.department || "").trim();
    const promotion = (req.query.promotion || "").trim();
    const status = (req.query.status || "").trim();
    const search = (req.query.search || "").trim();

    const conditions = [];
    const values = [];

    if (department) { values.push(department); conditions.push(`e.department = $${values.length}`); }
    if (promotion) { values.push(promotion); conditions.push(`e.promotion = $${values.length}`); }
    if (status) { values.push(status); conditions.push(`r.status = $${values.length}`); }
    if (search) {
      values.push(`%${search}%`);
      const idx = values.length;
      conditions.push(
        `(e.matricule ILIKE $${idx} OR e.name ILIKE $${idx} OR e.postnom ILIKE $${idx} OR e.prenom ILIKE $${idx})`,
      );
    }

    const result = await db.query(
      `SELECT
          r.id,
          r.objet,
          r.description,
          r.status,
          r.annee_universitaire,
          r.assigned_to_prof,
          r.created_at,
          e.name || ' ' || e.postnom || ' ' || e.prenom AS etudiant_name,
          e.matricule,
          e.department,
          e.promotion,
          e.id AS etudiant_id,
          (
            SELECT json_agg(json_build_object(
              'id', rc.id,
              'course_id', rc.course_id,
              'nom_cours', c.title,
              'evaluation', rc.evaluation,
              'piece_jointe', rc.piece_jointe,
              'professor_id', c.professor_id
            ))
            FROM recours_cours rc
            JOIN cours c ON c.id = rc.course_id
            WHERE rc.recours_id = r.id
          ) AS cours_list
       FROM recours r
       JOIN etudiants e ON e.id = r.etudiant_id
       ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
       ORDER BY r.created_at DESC`,
      values,
    );

    return res.json({ recours: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Erreur getAllRecoursAdmin:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Step 3 — Prof: list recours for his courses only (assigned_to_prof = TRUE)
 */
const getRecoursForProfessor = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié" });

  try {
    const profResult = await db.query("SELECT id FROM profs WHERE id = $1", [userId]);
    if (profResult.rows.length === 0) {
      console.log("aucun prof trouvé pour le userId", userId)
      return res.status(404).json({ message: "Profil professeur introuvable." });
    }
    const profId = profResult.rows[0].id;

    const status = (req.query.status || "").trim();
    const search = (req.query.search || "").trim();

    const conditions = [`c.professor_id = $1`, `r.assigned_to_prof = TRUE`];
    const values = [profId];

    if (status) { values.push(status); conditions.push(`r.status = $${values.length}`); }
    if (search) {
      values.push(`%${search}%`);
      const idx = values.length;
      conditions.push(
        `(e.matricule ILIKE $${idx} OR e.name ILIKE $${idx} OR e.postnom ILIKE $${idx} OR c.title ILIKE $${idx})`,
      );
    }

    const result = await db.query(
      `SELECT
         r.id, r.objet, r.description, r.status, r.annee_universitaire, r.created_at,
         e.matricule, e.name AS etudiant_name, e.postnom AS etudiant_postnom,
         rc.id AS recours_cours_id,
         c.title AS cours_nom,
         c.id AS course_id,
         rc.evaluation,
         rc.piece_jointe
       FROM recours r
       JOIN recours_cours rc ON rc.recours_id = r.id
       JOIN cours c ON c.id = rc.course_id
       JOIN etudiants e ON e.id = r.etudiant_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY r.created_at DESC`,
      values,
    );

    return res.json({ recours: result.rows });
  } catch (error) {
    console.error("Erreur getRecoursForProfessor:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Step 2 — Admin: send recours to professor
 */
const adminSendToProfessor = async (req, res) => {
  const id = req.params.id;
  const adminUserId = req.user && req.user.userId;
  if (!id) return res.status(400).json({ message: "ID du recours requis." });

  try {
    await db.query("BEGIN");
    const update = await db.query(
      `UPDATE recours SET assigned_to_prof = TRUE, status = 'en_cours' WHERE id = $1 RETURNING *`,
      [id],
    );
    if (update.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Recours introuvable." });
    }
    // Upsert a tracking record with admin_id
    await db.query(
      `INSERT INTO traitement_recours (recours_id, decision, motif, userid, admin_id, is_published)
       VALUES ($1, 'en_cours', 'Envoyé au professeur par l''administration', $2, $2, FALSE)
       ON CONFLICT DO NOTHING`,
      [id, adminUserId],
    ).catch(() => {});
    await db.query("COMMIT");
    return res.json({ message: "Recours envoyé au professeur.", recours: update.rows[0] });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Erreur adminSendToProfessor:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Admin: invalidate recours without sending to prof
 */
const adminInvalidateRecours = async (req, res) => {
  const id = req.params.id;
  const { motif } = req.body;
  if (!id) return res.status(400).json({ message: "ID du recours requis." });

  try {
    await db.query("BEGIN");
    const update = await db.query(
      `UPDATE recours SET status = 'refuse' WHERE id = $1 RETURNING *`,
      [id],
    );
    if (update.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Recours introuvable." });
    }
    await db.query(
      `INSERT INTO traitement_recours (recours_id, decision, motif, userid, is_published)
       VALUES ($1, 'refuse', $2, $3, TRUE)`,
      [id, motif || "Invalidé par l'administration", req.user.userId],
    );
    await db.query("COMMIT");
    return res.json({ message: "Recours invalidé.", recours: update.rows[0] });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("Erreur adminInvalidateRecours:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Serve attachment file by recours_cours id
 */
const getRecoursAttachment = async (req, res) => {
  const { recoursCourId } = req.params;
  try {
    const result = await db.query(
      `SELECT piece_jointe FROM recours_cours WHERE id = $1`,
      [recoursCourId],
    );
    if (result.rows.length === 0 || !result.rows[0].piece_jointe) {
      return res.status(404).json({ message: "Pièce jointe introuvable." });
    }
    const filePath = path.resolve(result.rows[0].piece_jointe);
    return res.sendFile(filePath);
  } catch (error) {
    console.error("Erreur getRecoursAttachment:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = {
  addRecours,
  normalizeEvaluation,
  getNumberOfRecoursEtudiant,
  getRecentRecoursEtudiant,
  getAllRecoursEtudiant,
  getAllRecoursAdmin,
  getRecoursForProfessor,
  adminSendToProfessor,
  adminInvalidateRecours,
  getRecoursAttachment,
};
