const db = require("../db/db"); // importer la connexion à la base de données
const bcrypt = require("bcrypt"); // importer bcrypt pour le hashage des mots de passe
const jwt = require("jsonwebtoken"); // importer jsonwebtoken pour la création de tokens d'authentification
const { loginEtudiant } = require("./etudiant.Controller");
const { loginProfs } = require("./profs.controller");

// Contrôleur pour l'inscription (admin uniquement)
const register = async (req, res) => {
  const { name, email, password, role, initCode } = req.body; // Récupérer les données d'inscription du corps de la requête

  // Validation des donnees entree par l'utilisateur
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Tous les champs sont requis" });
  }

  // Seul les admins peuvent être créés via cette route
  if (role && role !== "admin") {
    return res
      .status(403)
      .json({ message: "Seuls les administrateurs peuvent être créés" });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "L'utilisateur existe déjà" });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion de l'utilisateur dans la base de données
    const newUser = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, hashedPassword, "admin"],
    );

    // Générer un token JWT pour l'utilisateur nouvellement inscrit
    const token = jwt.sign(
      {
        userId: newUser.rows[0].id,
        role: newUser.rows[0].role,
        name: newUser.rows[0].name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );

    // retourner une réponse avec le token et les informations de l'utilisateur
    res.status(201).json({
      message: "Administrateur enregistré avec succès",
      user: newUser.rows[0],
      token: token,
      role: newUser.rows[0].role,
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
};

// Contrôleur pour la connexion
const login = async (req, res) => {
  const { email, password } = req.body; // recuperer les données de connexion du corps de la requête venu du formulaire de connexion

  // Validation des données entrées par l'utilisateur
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email et mot de passe sont requis" });
  }

  try {
    // verifier si l'utilisateur existe
    const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Utilisateur non trouvé" });
    }

    // verifier le mot de passe, on compare le mot de passe entré par l'utilisateur avec le mot de passe hashé stocké dans la base de données avec bcrypt.compare, qui retourne true si les mots de passe correspondent, sinon false
    const validPassword = await bcrypt.compare(password, user.rows[0].password);

    // si bcrypt.compare retourne false
    if (!validPassword) {
      return res.status(400).json({ message: "Mot de passe incorrect" });
    }

    // generer un token JWT
    const token = jwt.sign(
      {
        userId: user.rows[0].id,
        role: user.rows[0].role,
        name: user.rows[0].name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );
    return res.json({
      token: token,
      role: user.rows[0].role, // <--- Envoi du rôle au frontend
      name: user.rows[0].name, // <--- Envoi du nom au frontend
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return res.status(500).json({ message: "Erreur lors de la connexion" });
  }
};

const loginUser = async (req, res) => {
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ message: "Role requis pour la connexion utilisateur" });
  }

  if (role === "etudiant") {
    return loginEtudiant(req, res);
  }

  if (role === "professeur" || role === "enseignant") {
    return loginProfs(req, res);
  }

  return res.status(400).json({ message: "Role utilisateur invalide" });
};

// Controleur pour recuperer le nom et l'email de l'admin connecte
const getNameAndEmail = async (req, res) => {
  const userId = req.user.userId; // Récupérer l'identifiant de l'utilisateur à partir du token JWT (assurez-vous que le middleware d'authentification est en place pour extraire les informations du token)
  // verifie si le token existe
  if (!userId) {
    return res.status(400).json({ message: "Utilisateur non authentifié" });
  }

  try {
    // Recherche le name et email au travers de l'id
    const query = "SELECT name, email FROM users WHERE id = $1";
    const result = await db.query(query, [userId]); // le resultat de la recherche 

    // Si le resultat donne 0, utilisateur non trouvé
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const user = result.rows[0]; // si utilisateur trouve, on le stocke dans user
    return res.json({ name: user.name, email: user.email }); // returner les resultat de la recherche (name et email)
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de l'utilisateur:", error);
    return res.status(500).json({ message: "Erreur lors de la récupération des informations de l'utilisateur" });
  }
};

// Contrôleur pour la déconnexion (on supprime simplement le token(generer dans le login ou register) côté client, donc ici on peut juste retourner une réponse de succès)
const logout = async (req, res) => {
  try {
    // supprimer le token du client (côté client, il suffit de supprimer le token stocké)
    res.json({ message: "Déconnexion réussie" });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return res.status(500).json({ message: "Erreur lors de la déconnexion" });
  }
};

module.exports = {
  login,
  register,
  loginUser,
  logout,
  getNameAndEmail,
};
