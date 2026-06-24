const db = require("../db/db");

// ==========================================
// 1. AJOUTER UNE NOUVELLE CONFIGURATION (ANNÉE)
// ==========================================
const createConfiguration = async (req, res) => {
  const { annee_universitaire_active, est_active } = req.body;

  if (!annee_universitaire_active) {
    return res
      .status(400)
      .json({ message: "L'année universitaire est obligatoire." });
  }

  try {

    // on cherche l'id de la configuration avec l'annees academique active
    const checkExist = await db.query(
      "SELECT id FROM configuration WHERE annee_universitaire_active = $1",
      [annee_universitaire_active],
    );

    // Si le resultat de la recherche > 0
    if (checkExist.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Cette année universitaire est déjà configurée." });
    }

    // si est_active est true ou undefined, on le passe en false
    if (est_active === true || est_active === undefined) {
      await db.query("UPDATE configuration SET est_active = FALSE");
    }

    // on enregiste la nouvelle configuration dans la table configuration
    const nlleConfig = await db.query(
      `INSERT INTO configuration (annee_universitaire_active, est_active, updated_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [annee_universitaire_active, est_active !== false],
    );

    return res.status(201).json({
      message: "Nouvelle configuration universitaire ajoutée avec succès.",
      configuration: nlleConfig.rows[0], // les donnees de la configuration
    });
  } catch (error) {
    console.error("Erreur createConfiguration:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la création de la configuration." });
  }
};

// Mettre a jours une configuration existante
const updateConfiguration = async (req, res) => {
  const { id } = req.params;
  const { annee_universitaire_active, est_active } = req.body;

  try {
    if (est_active === true) {
      await db.query(
        "UPDATE configuration SET est_active = FALSE WHERE id <> $1",
        [id],
      );
    }

    const updateQuery = `
      UPDATE configuration 
      SET 
        annee_universitaire_active = COALESCE($1, annee_universitaire_active),
        est_active = COALESCE($2, est_active),
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;

    const result = await db.query(updateQuery, [
      annee_universitaire_active,
      est_active,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Configuration introuvable." });
    }

    return res.status(200).json({
      message: "Configuration mise à jour avec succès.",
      configuration: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateConfiguration:", error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

// ==========================================
// 3. OBTENIR LA PÉRIODE ACTIVE POUR L'ÉTUDIANT CONNECTÉ (Sécurisé & Filtré)
// ==========================================
const getActiveConfiguration = async (req, res) => {
  try {
    // 1. Récupérer l'étudiant connecté via le token (injecté par verifyToken)
    // On récupère dynamiquement son département et sa promotion
    const studentId = req.user.id;

    const studentCheck = await db.query(
      "SELECT department, promotion FROM etudiants WHERE user_id = $1",
      [studentId],
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ message: "Profil étudiant introuvable." });
    }

    const { department, promotion } = studentCheck.rows[0];

    // 2. Récupérer d'abord l'année universitaire active globale
    const configGlobal = await db.query(
      "SELECT annee_universitaire_active FROM configuration WHERE est_active = TRUE LIMIT 1",
    );

    if (configGlobal.rows.length === 0) {
      return res
        .status(404)
        .json({
          message: "Aucune année universitaire n'est active globalement.",
        });
    }

    const anneeActive = configGlobal.rows[0].annee_universitaire_active;

    // 3. Chercher la période de recours spécifique à la section de l'étudiant pour cette année
    const result = await db.query(
      `SELECT id, annee_universitaire, semestre, date_debut, date_fin, promotion, department
       FROM periode_recours 
       WHERE annee_universitaire = $1 
         AND department ILIKE $2 
         AND promotion ILIKE $3
       LIMIT 1`,
      [anneeActive, department, promotion],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Aucune période de recours n'est configurée pour votre département ou votre promotion.",
        annee_universitaire: anneeActive,
        department,
        promotion,
      });
    }

    // On renvoie la config complète trouvée pour l'étudiant
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Erreur getActiveConfiguration Étudiant:", error);
    return res.status(500).json({
      message:
        "Erreur interne lors de la vérification de vos droits d'accès aux recours.",
    });
  }
};

// ==========================================
// 4. OBTENIR TOUTES LES CONFIGURATIONS (Admin)
// ==========================================
const getAllConfigurations = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM configuration ORDER BY updated_at DESC",
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erreur getAllConfigurations:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la récupération de la liste." });
  }
};

// ==========================================
// 5. SUPPRIMER UNE CONFIGURATION
// ==========================================
const deleteConfiguration = async (req, res) => {
  const { id } = req.params;

  try {
    const checkActive = await db.query(
      "SELECT est_active FROM configuration WHERE id = $1",
      [id],
    );

    if (checkActive.rows.length === 0) {
      return res.status(404).json({ message: "Configuration introuvable." });
    }

    await db.query("DELETE FROM configuration WHERE id = $1", [id]);

    if (checkActive.rows[0].est_active) {
      await db.query(`
        UPDATE configuration 
        SET est_active = TRUE 
        WHERE id = (SELECT id FROM configuration ORDER BY updated_at DESC LIMIT 1)
      `);
    }

    return res
      .status(200)
      .json({ message: "Configuration supprimée avec succès." });
  } catch (error) {
    console.error("Erreur deleteConfiguration:", error);
    return res.status(500).json({ message: "Erreur lors de la suppression." });
  }
};

module.exports = {
  createConfiguration,
  updateConfiguration,
  getActiveConfiguration,
  getAllConfigurations,
  deleteConfiguration,
};
