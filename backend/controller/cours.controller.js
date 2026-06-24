const db = require("../db/db"); // Ton pool de connexion PostgreSQL

const addCours = async (req, res) => {
  try {
    const { title, description, department, promotion, professor_id, credits } =
      req.body;

    if (
      !title ||
      !department ||
      !promotion ||
      !professor_id ||
      credits == null
    ) {
      return res.status(400).json({
        error:
          "Les champs title, credits, department, promotion et professor_id sont obligatoires.",
      });
    }

    const queryText = `
            INSERT INTO cours (title, description, department, promotion, professor_id, credits)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, title, department, promotion, credits;
        `;

    const values = [
      title,
      description || null,
      department,
      promotion,
      parseInt(professor_id, 10),
      parseInt(credits, 10),
    ];

    const result = await db.query(queryText, values);

    return res.status(201).json({
      message: "Cours créé avec succès !",
      cours: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de la création du cours :", error);
    return res.status(500).json({
      error: "Une erreur interne est survenue lors de la création du cours.",
    });
  }
};

const updateCours = async (req, res) => {
  try {
    const { id } = req.params;
    const { credits, professor_id } = req.body;

    if (credits == null || !professor_id) {
      return res.status(400).json({
        error: "Les champs credits et professor_id sont obligatoires.",
      });
    }

    const queryText = `
            UPDATE cours
            SET credits = $1,
                professor_id = $2
            WHERE id = $3
            RETURNING *;
        `;
    const values = [
      parseInt(credits, 10),
      parseInt(professor_id, 10),
      parseInt(id, 10),
    ];
    const result = await db.query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cours introuvable." });
    }

    return res.status(200).json({
      message: "Cours mis à jour avec succès.",
      cours: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du cours :", error);
    return res
      .status(500)
      .json({ error: "Erreur interne lors de la mise à jour du cours." });
  }
};

const getCoursBydepartmentAndPromotion = async (req, res) => {
  try {
    // 1. Récupérer uniquement l'ID utilisateur injecté par le token
    const userId = req.user ? req.user.userId : null;

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié." });
    }

    // 2. Aller chercher le département et la promotion directement en Base de Données
    const etudiantResult = await db.query(
      "SELECT department, promotion FROM etudiants WHERE id = $1",
      [userId],
    );

    if (etudiantResult.rows.length === 0) {
      return res.status(403).json({ error: "Profil étudiant introuvable." });
    }

    const { department, promotion } = etudiantResult.rows[0];

    // 3. Votre requête SQL d'origine (mise à jour avec pr.department)
    const query = `
      SELECT c.id, c.title
      FROM cours c
      JOIN periode_cours pc ON c.id = pc.course_id
      JOIN periode_recours pr ON pc.periode_id = pr.id
      JOIN configuration cfg ON pr.annee_universitaire = cfg.annee_universitaire_active
      WHERE cfg.est_active = TRUE
        AND pr.department ILIKE $1
        AND pr.promotion::text ILIKE $2
        AND pr.date_debut <= CURRENT_DATE
        AND pr.date_fin >= CURRENT_DATE
      ORDER BY c.title ASC;
    `;

    const result = await db.query(query, [department, promotion]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erreur complète :", error);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

const getCoursByEtudiant = async (req, res) => {
  try {
    const { matricule } = req.params; // Récupération du matricule depuis l'URL

    if (!matricule) {
      return res
        .status(400)
        .json({ error: "Le matricule de l'étudiant est requis." });
    }

    // 1. Trouver le département et la promotion de l'étudiant
    const etudiantQuery = `
      SELECT department, promotion FROM etudiants WHERE matricule = $1;
    `;
    const etudiantResult = await db.query(etudiantQuery, [matricule]);

    if (etudiantResult.rows.length === 0) {
      return res.status(404).json({ error: "Étudiant introuvable." });
    }

    const { department, promotion } = etudiantResult.rows[0];

    // 2. Récupérer les cours correspondants avec le nom du professeur
    const coursQuery = `
      SELECT 
        c.id, 
        c.title,
        p.name AS professor_name
      FROM cours c
      JOIN profs p ON c.professor_id = p.id
      WHERE c.department = $1 AND c.promotion = $2
      ORDER BY c.title ASC;
    `;
    const coursResult = await db.query(coursQuery, [department, promotion]);

    return res.status(200).json({
      ok: true,
      department,
      promotion,
      cours: coursResult.rows,
    });
  } catch (error) {
    console.error("Erreur dans getCoursByEtudiant :", error);
    return res.status(500).json({
      error:
        "Une erreur interne est survenue lors de la récupération des cours.",
    });
  }
};

const getAllCours = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const department = (req.query.department || "").trim();
    const promotion = (req.query.promotion || "").trim();

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(c.title ILIKE $${values.length} OR p.name ILIKE $${values.length})`);
    }
    if (department) {
      values.push(department);
      conditions.push(`c.department = $${values.length}`);
    }
    if (promotion) {
      values.push(promotion);
      conditions.push(`c.promotion = $${values.length}`);
    }

    const query = `
      SELECT c.*, p.name || ' ' || p.prenom AS professor_name
      FROM cours c
      LEFT JOIN profs p ON p.id = c.professor_id
      ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(query, values);
    return res.json({ cours: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Erreur lors de la récupération des cours:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la récupération des cours" });
  }
};

// obtenir le nombre total des cours
const getNumberOfCours = async (req, res) => {
  const userId = req.user && req.user.userId;

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  try {
    // Requête pour compter le nombre total de lignes dans la table cours
    const result = await db.query("SELECT COUNT(*) FROM cours");
    const count = parseInt(result.rows[0].count, 10);

    return res.json({ count });
  } catch (error) {
    console.error("Erreur lors de la récupération du nombre de cours:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération du nombre de cours",
    });
  }
};

// Supprimer un cours
const getCoursById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a valid integer
    const courseId = parseInt(id, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ message: "ID du cours invalide" });
    }

    const result = await db.query(
      `SELECT c.*, p.name || ' ' || p.prenom AS professor_name
       FROM cours c
       LEFT JOIN profs p ON p.id = c.professor_id
       WHERE c.id = $1`,
      [courseId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cours introuvable" });
    }

    return res.json({ cours: result.rows[0] });
  } catch (error) {
    console.error("Erreur lors de la récupération du cours:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const getCoursByPeriode = async (req, res) => {
  try {
    const { periodeId } = req.params;

    // Validation de l'identifiant de la période
    const parsedPeriodeId = parseInt(periodeId, 10);
    if (isNaN(parsedPeriodeId)) {
      return res
        .status(400)
        .json({ error: "L'identifiant de la période est invalide." });
    }

    // Requête SQL pour récupérer les cours liés à cette période
    const query = `
      SELECT 
        c.id, 
        c.title, 
        c.department, 
        c.promotion, 
        c.credits,
        p.name AS professor_name
      FROM cours c
      JOIN periode_cours pc ON c.id = pc.course_id
      LEFT JOIN profs p ON c.professor_id = p.id
      WHERE pc.periode_id = $1
      ORDER BY c.title ASC;
    `;

    const result = await db.query(query, [parsedPeriodeId]);

    return res.status(200).json({
      ok: true,
      total: result.rows.length,
      cours: result.rows,
    });
  } catch (error) {
    console.error("Erreur dans getCoursByPeriode :", error);
    return res.status(500).json({
      error:
        "Une erreur interne est survenue lors de la récupération des cours de la période.",
    });
  }
};

const deleteCours = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "L'ID du cours est obligatoire." });
    }

    const queryText = "DELETE FROM cours WHERE id = $1 RETURNING id, title;";
    const result = await db.query(queryText, [parseInt(id, 10)]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Cours introuvable ou déjà supprimé." });
    }

    return res.status(200).json({
      message: "Cours supprimé avec succès.",
      cours: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du cours :", error);
    return res.status(500).json({
      error: "Une erreur interne est survenue lors de la suppression du cours.",
    });
  }
};

module.exports = {
  addCours,
  updateCours,
  getCoursBydepartmentAndPromotion,
  getCoursByEtudiant,
  getNumberOfCours,
  getAllCours,
  getCoursById,
  getCoursByPeriode,
  deleteCours,
};
