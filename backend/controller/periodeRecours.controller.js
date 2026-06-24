const db = require("../db/db");

// Fonction pour ajouter une nouvelle période de recours avec des validations strictes et une gestion transactionnelle
const addPeriodeRecours = async (req, res) => {
  // Récupération des données du corps de la requête (Nettoyé des doublons)
  const {
    annee_universitaire,
    semestre,
    date_debut,
    date_fin,
    promotion,
    department,
    depatment,
    departement,
    course_ids = [],
  } = req.body;

  // On récupère la valeur peu importe comment le front l'a nommée
  const departmentValue = department ?? depatment ?? departement;

  // 1. Validations strictes avant d'ouvrir la base de données
  if (
    !annee_universitaire ||
    semestre == null ||
    !date_debut ||
    !date_fin ||
    !promotion ||
    !departmentValue
  ) {
    return res.status(400).json({
      message:
        "Les champs annee_universitaire, semestre, date_debut, date_fin, promotion et department sont obligatoires.",
    });
  }

  // Définir le semestre comme un entier positif
  const semestreValue = Number(semestre);
  if (!Number.isInteger(semestreValue) || semestreValue < 1) {
    return res
      .status(400)
      .json({ message: "Le semestre doit être un entier positif." });
  }

  const debutTime = Date.parse(date_debut); // Convertir la date de début en timestamp
  const finTime = Date.parse(date_fin); // Convertir la date de fin en timestamp

  // Vérification de la validité des dates et de leur ordre
  if (Number.isNaN(debutTime) || Number.isNaN(finTime) || finTime < debutTime) {
    return res.status(400).json({
      message:
        "Les dates sont invalides ou la date de fin est antérieure à la date de début.",
    });
  }

  // Validation anticipée des IDs de cours si fournis
  let validatedCourseIds = [];

  if (Array.isArray(course_ids) && course_ids.length > 0) {
    for (const courseId of course_ids) {
      const parsedCourseId = Number(courseId);
      if (!Number.isInteger(parsedCourseId)) {
        return res.status(400).json({
          message: "Chaque identifiant de cours doit être un entier valide.",
        });
      }
      validatedCourseIds.push(parsedCourseId);
    }
  }

  // 2. Exécution de la Transaction
  try {
    await db.query("BEGIN");

    // CORRECTION ICI : Remplacement de 'departement' par 'department' dans la requête SQL d'insertion
    const periodeResult = await db.query(
      `INSERT INTO periode_recours (annee_universitaire, semestre, date_debut, date_fin, promotion, department)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, annee_universitaire, semestre, date_debut, date_fin, promotion, department`,
      [
        annee_universitaire,
        semestreValue,
        date_debut,
        date_fin,
        promotion,
        departmentValue,
      ],
    );

    const periode = periodeResult.rows[0];

    // AUTOMATISATION : Si aucun cours spécifique n'a été envoyé, on va chercher
    // tous les cours qui matchent ce département et cette promotion
    if (validatedCourseIds.length === 0) {
      const autoCourses = await db.query(
        `SELECT id FROM cours WHERE department ILIKE $1 AND promotion ILIKE $2`,
        [departmentValue, promotion],
      );
      validatedCourseIds = autoCourses.rows.map((row) => row.id);
    }

    // Insertion groupée (Bulk Insert) des liaisons cours <> période
    if (validatedCourseIds.length > 0) {
      const valuesQuery = validatedCourseIds
        .map((_, index) => `($1, $${index + 2})`)
        .join(", ");
      const queryParams = [periode.id, ...validatedCourseIds];

      await db.query(
        `INSERT INTO periode_cours (periode_id, course_id)
         VALUES ${valuesQuery}
         ON CONFLICT (periode_id, course_id) DO NOTHING`,
        queryParams,
      );
    }

    await db.query("COMMIT");

    return res.status(201).json({
      message: "Période de recours créée avec succès.",
      periode,
      cours_associes_count: validatedCourseIds.length,
    });
  } catch (error) {
    try {
      await db.query("ROLLBACK");
    } catch (e) {}
    console.error(
      "Erreur lors de la création de la période de recours:",
      error,
    );
    return res.status(500).json({
      message: "Erreur interne lors de la création de la période de recours.",
    });
  }
};

// Fonction pour récupérer toutes les périodes (actives et inactives)
const getAllPeriodes = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, annee_universitaire, semestre, date_debut, date_fin, promotion, department
       FROM periode_recours
       ORDER BY date_debut DESC`,
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de toutes les périodes :",
      error,
    );
    return res.status(500).json({
      message:
        "Erreur interne du serveur lors de la récupération des périodes.",
    });
  }
};

const getActivePeriodeForStudent = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Utilisateur non authentifié." });
    }

    const studentResult = await db.query(
      "SELECT department, promotion FROM etudiants WHERE user_id = $1",
      [userId],
    );

    if (studentResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Profil étudiant introuvable pour cet utilisateur." });
    }

    const { department, promotion } = studentResult.rows[0];
    const today = new Date().toISOString().slice(0, 10);

    // CORRECTION ICI : Remplacement de 'p.departement' par 'p.department'
    const result = await db.query(
      `SELECT p.id, p.annee_universitaire, p.semestre, p.date_debut, p.date_fin, p.promotion, p.department
       FROM periode_recours p
       JOIN configuration cfg ON p.annee_universitaire = cfg.annee_universitaire_active
       WHERE cfg.est_active = TRUE
         AND p.department ILIKE $1
         AND p.promotion::text ILIKE $2
         AND p.date_debut <= $3
         AND p.date_fin >= $3
       LIMIT 1`,
      [department, promotion, today],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Aucune période de recours active n'est configurée pour votre département et votre promotion.",
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de la période active pour l'étudiant :",
      error,
    );
    return res.status(500).json({
      message:
        "Erreur interne du serveur lors de la récupération de la période active.",
    });
  }
};

module.exports = {
  addPeriodeRecours,
  getAllPeriodes,
  getActivePeriodeForStudent,
};
