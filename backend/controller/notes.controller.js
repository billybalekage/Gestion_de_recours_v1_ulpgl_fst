const db = require("../db/db");

// 1. Enregistrement ou mise à jour d'une note (Professeur)
const addNote = async (req, res) => {
  const {
    matricule,
    course_id,
    annee_universitaire,
    semestre,
    note_tp,
    note_td,
    note_interrogation,
    note_examen,
  } = req.body;

  if (!matricule || !course_id || !annee_universitaire || !semestre) {
    return res.status(400).json({
      message:
        "Champs obligatoires manquants (matricule, course_id, annee_universitaire, semestre).",
    });
  }

  try {
    const query = `
      INSERT INTO notes (
        matricule, 
        course_id, 
        annee_universitaire, 
        semestre, 
        note_tp, 
        note_td, 
        note_interrogation, 
        note_examen
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      
      -- Gestion du conflit basée sur le matricule
      ON CONFLICT (matricule, course_id, annee_universitaire) 
      DO UPDATE SET 
        note_tp = COALESCE(EXCLUDED.note_tp, notes.note_tp),
        note_td = COALESCE(EXCLUDED.note_td, notes.note_td),
        note_interrogation = COALESCE(EXCLUDED.note_interrogation, notes.note_interrogation),
        note_examen = COALESCE(EXCLUDED.note_examen, notes.note_examen),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      matricule,
      course_id,
      annee_universitaire,
      semestre,
      note_tp !== undefined ? note_tp : null,
      note_td !== undefined ? note_td : null,
      note_interrogation !== undefined ? note_interrogation : null,
      note_examen !== undefined ? note_examen : null,
    ];

    const result = await db.query(query, values);

    return res.status(200).json({
      message:
        "Notes enregistrées ou mises à jour avec succès via le matricule !",
      note: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur addNote avec matricule :", error);
    return res
      .status(500)
      .json({ message: "Erreur serveur lors de l'enregistrement." });
  }
};

// 2. Récupération des notes de l'étudiant connecté (Étudiant)
const getNotesByMatriculeForAdmin = async (req, res) => {
  try {
    const { matricule } = req.params;
    if (!matricule) {
      return res.status(400).json({ message: "Matricule requis." });
    }

    const result = await db.query(
      `SELECT n.*, c.title AS course_name
       FROM notes n
       JOIN cours c ON c.id = n.course_id
       WHERE n.matricule = $1
       ORDER BY n.annee_universitaire DESC, n.semestre ASC, c.title ASC`,
      [matricule],
    );

    return res.json({ notes: result.rows });
  } catch (error) {
    console.error("Erreur getNotesByMatriculeForAdmin:", error);
    return res
      .status(500)
      .json({ message: "Erreur serveur lors de la récupération des notes." });
  }
};

const getMyNotes = async (req, res) => {
  let matricule = req.user?.userMatricule || req.user?.matricule || null;

  if (!matricule && req.user?.userId) {
    try {
      const student = await db.query(
        "SELECT matricule FROM etudiants WHERE id = $1 LIMIT 1",
        [req.user.userId],
      );
      matricule = student.rows[0]?.matricule || null;
    } catch (lookupError) {
      console.error(
        "Erreur lors de la récupération du matricule via userId:",
        lookupError,
      );
    }
  }

  console.log("=== DEBUG NOTES ===");
  console.log("Matricule de l'étudiant connecté obtenu du Token :", matricule);

  if (!matricule) {
    return res.status(401).json({
      message:
        "Accès refusé. Matricule manquant ou invalide. Veuillez vous reconnecter.",
    });
  }

  try {
    // Récupérer le département et la promotion de l'étudiant
    const studentRes = await db.query(
      "SELECT department, promotion FROM etudiants WHERE matricule = $1 LIMIT 1",
      [matricule],
    );
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ message: "Profil étudiant introuvable." });
    }
    const { department, promotion } = studentRes.rows[0];

    // Tous les cours du département + promotion de l'étudiant, avec leurs notes (LEFT JOIN)
    const query = `
      SELECT
        c.id AS course_id,
        c.title AS course_name,
        c.credits,
        p.name AS professor_name,
        n.note_tp,
        n.note_td,
        n.note_interrogation,
        n.note_examen,
        n.semestre,
        n.annee_universitaire
      FROM cours c
      LEFT JOIN profs p ON p.id = c.professor_id
      LEFT JOIN notes n ON n.course_id = c.id AND n.matricule = $1
      WHERE c.department = $2 AND c.promotion = $3
      ORDER BY c.title;
    `;

    const result = await db.query(query, [matricule, department, promotion]);

    // Renvoi du tableau de notes au frontend
    return res.json({ notes: result.rows });
  } catch (error) {
    console.error("Erreur lors de la récupération des notes :", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la récupération de vos notes.",
    });
  }
};

module.exports = {
  addNote,
  getMyNotes,
  getNotesByMatriculeForAdmin,
};
