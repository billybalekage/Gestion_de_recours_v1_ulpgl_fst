const db = require("../db/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const addEtudiant = async (req, res) => {
  const {
    name,
    postnom,
    prenom,
    sexe,
    matricule,
    date_naissance,
    email,
    telephone,
    promotion,
    department,
  } = req.body;

  if (
    !name ||
    !postnom ||
    !prenom ||
    !sexe ||
    !email ||
    !telephone ||
    !promotion ||
    !department
  ) {
    return res.status(400).json({ message: "Tous les champs sont requis" });
  }

  const role = "etudiant";
  const user_id = req.user && req.user.userId;

  if (!user_id) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }

  try {
    // Vérifier que l'utilisateur existe dans la table users
    const userExists = await db.query("SELECT id FROM users WHERE id = $1", [
      user_id,
    ]);

    if (userExists.rows.length === 0) {
      return res.status(400).json({
        message:
          "L'utilisateur associé n'existe pas. Veuillez vous réinscrire.",
      });
    }

    const generatedMatricule =
      (matricule && matricule.trim()) ||
      `ETU${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

    const formattedDateNaissance = date_naissance && date_naissance.trim() !== "" ? date_naissance : null;

    const result = await db.query(
      "INSERT INTO etudiants (name, postnom, prenom, sexe, matricule, promotion, department, email, telephone, date_naissance, role, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
      [
        name,
        postnom,
        prenom,
        sexe,
        generatedMatricule,
        promotion,
        department,
        email,
        telephone,
        formattedDateNaissance,
        role,
        user_id,
      ],
    );

    console.log("Étudiant ajouté avec succès:", result.rows[0]);

    return res.status(201).json({
      message: "Étudiant ajouté avec succès",
      etudiant: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'étudiant:", error);

    return res.status(500).json({
      message: "Erreur lors de l'ajout de l'étudiant",
      error: error.message,
    });
  }
};

const updateEtudiant = async (req, res) => {
  const { id } = req.params;
  const { email, promotion, department } = req.body;

  if (!email || !promotion || !department) {
    return res.status(400).json({ message: "Tous les champs sont requis" });
  }

  try {
    const result = await db.query(
      "UPDATE etudiants SET email = $1, promotion = $2, department = $3 WHERE id = $4 RETURNING *",
      [email, promotion, department, parseInt(id, 10)],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Étudiant introuvable" });
    }

    return res.status(200).json({
      message: "Étudiant mis à jour avec succès",
      etudiant: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'étudiant:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const loginEtudiant = async (req, res) => {
  const { email, password, matricule, newPassword } = req.body; // recupérer le matricule et le nouveau mot de passe pour la première connexion dans la requette

  // on verifi l'email est fourni
  if (!email) {
    return res.status(400).json({ message: "Email est requis" });
  }

  try {
    // on cherche l'étudiant par email
    const result = await db.query("SELECT * FROM etudiants WHERE email = $1", [
      email,
    ]);

    // s'il n'existe pas, on retourne une erreur
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Étudiant non trouvé" });
    }

    const etudiant = result.rows[0]; // on prend le premier résultat (il devrait y en avoir qu'un)

    // Première connexion : créer un mot de passe si aucun n'est défini
    if (!etudiant.password) {
      // etudiant.password veut dire que le mot de passe n'est pas encore défini, donc c'est la première connexion
      if (!matricule || !newPassword) {
        return res.status(400).json({
          message:
            "Première connexion : fournissez votre matricule et un nouveau mot de passe",
        });
      }

      // Si le matricule fourni ne correspond pas à celui de l'étudiant, on retourne une erreur
      if (matricule !== etudiant.matricule) {
        return res.status(403).json({ message: "Matricule incorrect" });
      }

      // Hasher le nouveau mot de passe et le stocker dans la base de données
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // metre a jours le mot de passe de l'étudiant dans la base de données
      await db.query("UPDATE etudiants SET password = $1 WHERE id = $2", [
        hashedPassword,
        etudiant.id,
      ]);

      // Générer un token JWT pour l'étudiant
      const token = jwt.sign(
        {
          // On stocke dans le token les informations de base de l'étudiant pour pouvoir les utiliser dans les autres routes protégées ( id, matricule, name, role, department, promotion)
          userId: etudiant.id,
          userMatricule: etudiant.matricule,
          username: etudiant.name,
          role: etudiant.role,
          department: etudiant.department,
          promotion: etudiant.promotion,
        },
        process.env.JWT_SECRET, // la cles secret pour signer le token
        { expiresIn: "2h" }, // duree de vie du token
      );

      // on envoie le token au client(frontend) pour qu'il puisse l'utiliser pour les prochaines requettes protégées
      return res.status(201).json({
        message: "Mot de passe créé avec succès",
        token,
        role: etudiant.role, // on envoie aussi le role de l'etudiant pour que le client puisse adapter l'interface en fonction du role
      });
    }

    // Connexion normale : vérifier le mot de passe
    if (!password) {
      return res.status(400).json({ message: "Mot de passe est requis" });
    }

    // comparer le mot de passe fourni avec celui stocké dans la base de données (qui est hashé) avec bcrypt.compare qui retourne true si les mots de passe correspondent et false sinon
    const validPassword = await bcrypt.compare(password, etudiant.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Mot de passe incorrect" });
    }

    // Creer le token JWT pour l'étudiant connecté avec les informations de base de l'étudiant ( id, matricule, name, role, department, promotion) pour pouvoir les utiliser dans les autres routes protégées
    const token = jwt.sign(
      {
        userId: etudiant.id,
        userName: etudiant.name,
        userMatricule: etudiant.matricule,
        role: etudiant.role,
        department: etudiant.department,
        promotion: etudiant.promotion,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );

    return res.json({ token, role: etudiant.role });
  } catch (error) {
    console.error("Erreur lors de la connexion de l'étudiant:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la connexion de l'étudiant" });
  }
};

const getEtudiantById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query("SELECT * FROM etudiants WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Étudiant non trouvé" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur lors de la récupération de l'étudiant" });
    console.error("Erreur lors de la récupération de l'étudiant:", error);
  }
};

const getMyEtudiantNameAndMatricule = async (req, res) => {
  const userId = req.user && req.user.userId;

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }
  try {
    const query = "SELECT name, matricule FROM etudiants WHERE  id = $1";
    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Étudiant non trouvé" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération du nom et matricule de l'étudiant:",
      error,
    );
    return res.status(500).json({
      message:
        "Erreur lors de la récupération du nom et matricule de l'étudiant",
    });
  }
};

const getEtudiantByDepartement = async (req, res) => {
  const { department } = req.params;

  try {
    const result = await db.query(
      "SELECT * FROM etudiants WHERE department = $1",
      [department],
    );

    return res.json(result.rows);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur lors de la récupération des étudiants" });
    console.error("Erreur lors de la récupération des étudiants:", error);
  }
};

const getEtudiantByPromotion = async (req, res) => {
  const { promotion } = req.params;

  try {
    const result = await db.query(
      "SELECT * FROM etudiants WHERE promotion = $1",
      [promotion],
    );

    return res.json(result.rows);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur lors de la récupération des étudiants" });
    console.error("Erreur lors de la récupération des étudiants:", error);
  }
};

const getAllEtudiants = async (req, res) => {
  try {
    const search = (req.query.search || "").trim(); //
    const department = (req.query.department || "").trim(); //
    const promotion = (req.query.promotion || "").trim();

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(name ILIKE $${values.length} OR prenom ILIKE $${values.length} OR matricule ILIKE $${values.length})`,
      );
    }
    if (department) {
      values.push(department);
      conditions.push(`department = $${values.length}`);
    }
    if (promotion) {
      values.push(promotion);
      conditions.push(`promotion = $${values.length}`);
    }

    const query = `SELECT * FROM etudiants ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""} ORDER BY created_at DESC`;
    const result = await db.query(query, values);

    return res.json({ etudiants: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Erreur lors de la récupération des étudiants:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la récupération des étudiants" });
  }
};

const getNumberOfEtudiants = async (req, res) => {
  const userId = req.user && req.user.userId;

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }
  try {
    const result = await db.query("SELECT COUNT(*) FROM etudiants");
    const count = parseInt(result.rows[0].count, 10);
    return res.json({ count });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération du nombre d'étudiants:",
      error,
    );
    return res.status(500).json({
      message: "Erreur lors de la récupération du nombre d'étudiants",
    });
  }
};

const deleteEtudiant = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM etudiants WHERE id = $1 RETURNING id, matricule, name",
      [parseInt(id, 10)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Étudiant introuvable" });
    }

    return res.json({ message: "Étudiant supprimé", etudiant: result.rows[0] });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'étudiant:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la suppression de l'étudiant" });
  }
};

const logoutEtudiant = async (req, res) => {
  try {
    // supprimer le token du client (côté client, il suffit de supprimer le token stocké)
    res.json({ message: "Déconnexion réussie" });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return res.status(500).json({ message: "Erreur lors de la déconnexion" });
  }
};

module.exports = {
  addEtudiant,
  updateEtudiant,
  loginEtudiant,
  getEtudiantById,
  getEtudiantByDepartement,
  getEtudiantByPromotion,
  getAllEtudiants,
  logoutEtudiant,
  getMyEtudiantNameAndMatricule,
  getNumberOfEtudiants,
  deleteEtudiant,
};
