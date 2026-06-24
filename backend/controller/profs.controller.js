const db = require("../db/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const addProf = async (req, res) => {
  const {
    name,
    postnom,
    prenom,
    matricule,
    email,
    department,
    sexe,
    date_naissance,
    etat_civil,
    profession,
    telephone,
  } = req.body;

  if (
    !name ||
    !postnom ||
    !prenom ||
    !matricule ||
    !email ||
    !department ||
    !sexe
  ) {
    return res
      .status(400)
      .json({ message: "Veuillez remplir tous les champs obligatoires" });
  }

  const role = "enseignant";
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

    const result = await db.query(
      "INSERT INTO profs (name, postnom, prenom, matricule, email, department, sexe, date_naissance, etat_civil, profession, telephone, role, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *",
      [
        name,
        postnom,
        prenom,
        matricule,
        email,
        department,
        sexe,
        date_naissance || null,
        etat_civil || null,
        profession || null,
        telephone || null,
        role,
        user_id,
      ],
    );

    console.log("Prof ajouté avec succès:", result.rows[0]);

    return res.status(201).json({
      message: "Prof ajouté avec succès",
      prof: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout du prof:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const loginProfs = async (req, res) => {
  const { email, password, matricule, newPassword } = req.body; // recupérer le matricule et le nouveau mot de passe pour la première connexion dans la requette

  // on verifi l'email est fourni
  if (!email) {
    return res.status(400).json({ message: "Email est requis" });
  }

  try {
    // on cherche l'étudiant par email
    const result = await db.query("SELECT * FROM profs WHERE email = $1", [
      email,
    ]);

    // s'il n'existe pas, on retourne une erreur
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Prof non trouvé" });
    }

    const profs = result.rows[0]; // on prend le premier résultat (il devrait y en avoir qu'un)

    // Première connexion : créer un mot de passe si aucun n'est défini
    if (!profs.password) {
      // profs.password absent signifie première connexion
      if (!matricule || !newPassword) {
        return res.status(400).json({
          message:
            "Première connexion : fournissez votre matricule et un nouveau mot de passe",
        });
      }

      // Si le matricule fourni ne correspond pas à celui du professeur, on retourne une erreur
      if (matricule !== profs.matricule) {
        return res.status(403).json({ message: "Matricule incorrect" });
      }

      // Hasher le nouveau mot de passe et le stocker dans la base de données
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // mettre à jour le mot de passe du professeur dans la base de données
      await db.query("UPDATE profs SET password = $1 WHERE id = $2", [
        hashedPassword,
        profs.id,
      ]);

      // Générer un token JWT pour le professeur
      const token = jwt.sign(
        {
          userId: profs.id,
          userMatricule: profs.matricule,
          userName: profs.name,
          role: profs.role,
          department: profs.department,
        },
        process.env.JWT_SECRET,
        { expiresIn: "2h" },
      );

      // on envoie le token au client(frontend)
      return res.status(201).json({
        message: "Mot de passe créé avec succès",
        token,
        role: profs.role,
      });
    }

    // Connexion normale : vérifier le mot de passe
    if (!password) {
      return res.status(400).json({ message: "Mot de passe est requis" });
    }

    // comparer le mot de passe fourni avec celui stocké dans la base de données (qui est hashé) avec bcrypt.compare qui retourne true si les mots de passe correspondent et false sinon
    const validPassword = await bcrypt.compare(password, profs.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Mot de passe incorrect" });
    }

    // Creer le token JWT pour l'étudiant connecté avec les informations de base de l'étudiant ( id, matricule, name, role, department, promotion) pour pouvoir les utiliser dans les autres routes protégées
    const token = jwt.sign(
      {
        userId: profs.id,
        userName: profs.name,
        userMatricule: profs.matricule,
        role: profs.role,
        department: profs.department,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );

    return res.json({ token, role: profs.role });
  } catch (error) {
    console.error("Erreur lors de la connexion du professeur:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la connexion du professeur" });
  }
};

const updateProf = async (req, res) => {
  const { id } = req.params;
  const { email, etat_civil, telephone } = req.body;

  if (!email || !etat_civil || !telephone) {
    return res.status(400).json({ message: "Tous les champs sont requis" });
  }

  try {
    const result = await db.query(
      "UPDATE profs SET email = $1, etat_civil = $2, telephone = $3 WHERE id = $4 RETURNING *",
      [email, etat_civil, telephone, parseInt(id, 10)],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Professeur introuvable" });
    }

    return res.status(200).json({
      message: "Professeur mis à jour avec succès",
      prof: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du prof:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const getProfById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, name, postnom, prenom, department, email, sexe, date_naissance, etat_civil, profession, telephone, created_at
       FROM profs
       WHERE id = $1`,
      [parseInt(id, 10)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Professeur introuvable" });
    }

    return res.json({ professeur: result.rows[0] });
  } catch (error) {
    console.error("Erreur lors de la récupération du professeur:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const getProfessorDashboard = async (req, res) => {
  const professeurId = req.user && req.user.userId;
  if (!professeurId)
    return res.status(401).json({ message: "Utilisateur non authentifié" });

  try {
    const [
      profResult,
      studentsByPromotion,
      totalRecoursResult,
      totalStudentsResult,
    ] = await Promise.all([
      db.query(
        `SELECT id, department, name, postnom, prenom FROM profs WHERE id = $1`,
        [professeurId],
      ),
      db.query(
        `SELECT promotion, COUNT(*)::int AS total
           FROM etudiants
           WHERE department = (
             SELECT department FROM profs WHERE id = $1
           )
           GROUP BY promotion
           ORDER BY promotion`,
        [professeurId],
      ),
      db.query(
        `SELECT COUNT(DISTINCT r.id)::int AS total_recours
           FROM recours r
           JOIN recours_cours rc ON rc.recours_id = r.id
           JOIN cours c ON c.id = rc.course_id
           WHERE c.professor_id = $1
             AND COALESCE(r.assigned_to_prof, FALSE) = TRUE
             AND r.status = 'en_cours'`,
        [professeurId],
      ),
      db.query(
        `SELECT COUNT(*)::int AS total_students
           FROM etudiants
           WHERE department = (
             SELECT department FROM profs WHERE id = $1
           )`,
        [professeurId],
      ),
    ]);

    if (profResult.rows.length === 0) {
      return res.status(404).json({ message: "Professeur introuvable" });
    }

    const dashboard = {
      total_students_department: totalStudentsResult.rows[0].total_students,
      students_by_promotion: studentsByPromotion.rows,
      total_recours_assigned: totalRecoursResult.rows[0].total_recours,
      department: profResult.rows[0].department,
      professor_name: `${profResult.rows[0].name} ${profResult.rows[0].postnom}`,
    };

    return res.json({ dashboard });
  } catch (error) {
    console.error("Erreur getProfessorDashboard:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const getStudentsForProfessor = async (req, res) => {
  const professeurId = req.user && req.user.userId;
  if (!professeurId)
    return res.status(401).json({ message: "Utilisateur non authentifié" });

  const search = (req.query.search || "").trim();
  const promotion = (req.query.promotion || "").trim();
  const values = [professeurId];
  const filters = [
    `department = (
       SELECT department FROM profs WHERE id = $1
     )`,
  ];

  if (promotion) {
    values.push(promotion);
    filters.push(`promotion = $${values.length}`);
  }
  if (search) {
    values.push(`%${search}%`);
    filters.push(
      `(matricule ILIKE $${values.length} OR name ILIKE $${values.length} OR postnom ILIKE $${values.length} OR email ILIKE $${values.length})`,
    );
  }

  try {
    const result = await db.query(
      `SELECT id, matricule, name, postnom, prenom, email, promotion, department
       FROM etudiants
       WHERE ${filters.join(" AND ")}
       ORDER BY name, postnom, prenom`,
      values,
    );

    return res.json({ students: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Erreur getStudentsForProfessor:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const getStudentDetailsForProfessor = async (req, res) => {
  const professeurId = req.user && req.user.userId;
  if (!professeurId)
    return res.status(401).json({ message: "Utilisateur non authentifié" });

  const { matricule } = req.params;
  if (!matricule) return res.status(400).json({ message: "Matricule requis" });

  try {
    const result = await db.query(
      `SELECT id, matricule, name, postnom, prenom, email, telephone, promotion, department, sexe, date_naissance
       FROM etudiants
       WHERE matricule = $1
         AND department = (
           SELECT department FROM profs WHERE id = $2
         )`,
      [matricule, professeurId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Étudiant introuvable" });
    }

    return res.json({ student: result.rows[0] });
  } catch (error) {
    console.error("Erreur getStudentDetailsForProfessor:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

const getAllProfs = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const department = (req.query.department || "").trim();

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(name ILIKE $${values.length} OR postnom ILIKE $${values.length} OR prenom ILIKE $${values.length} OR email ILIKE $${values.length} OR department::text ILIKE $${values.length})`,
      );
    }
    if (department) {
      values.push(department);
      conditions.push(`department = $${values.length}`);
    }

    const query = `
      SELECT id, name, postnom, prenom, email, telephone, department, sexe, date_naissance, etat_civil, profession, created_at
      FROM profs
      ${conditions.length ? "WHERE " + conditions.join(" AND ") : ""}
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, values);

    return res.json({ profs: result.rows, total: result.rows.length });
  } catch (error) {
    console.error("Erreur lors de la récupération des professeurs:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la récupération des professeurs" });
  }
};

const getNumberOfProfs = async (req, res) => {
  try {
    const result = await db.query("SELECT COUNT(*) FROM profs");
    return res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (error) {
    console.error("Erreur lors du comptage des professeurs:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors du comptage des professeurs" });
  }
};

const getProfCountByDepartment = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT department, COUNT(*)::int AS count FROM profs GROUP BY department ORDER BY department",
    );

    return res.json({ counts: result.rows });
  } catch (error) {
    console.error("Erreur lors du comptage par département:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors du comptage par département" });
  }
};

const deleteProf = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM profs WHERE id = $1 RETURNING id, name, prenom",
      [parseInt(id, 10)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Professeur introuvable" });
    }

    return res.json({
      message: "Professeur supprimé",
      professeur: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du professeur:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la suppression du professeur" });
  }
};

const getProfByCours = async (req, res) => {};

module.exports = {
  addProf,
  updateProf,
  getProfById,
  getProfessorDashboard,
  getStudentsForProfessor,
  getStudentDetailsForProfessor,
  getAllProfs,
  getNumberOfProfs,
  getProfCountByDepartment,
  deleteProf,
  getProfByCours,
  loginProfs,
};
