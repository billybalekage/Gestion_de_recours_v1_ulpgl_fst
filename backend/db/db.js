require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

let db;

if (process.env.DATABASE_URL) {
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  db = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
}

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await db.query(text, params);
    const duration = Date.now() - start;
    console.log("Query executed in", duration, "ms");
    return res;
  } catch (error) {
    console.error("SQL query error:", error.message);
    throw error;
  }
};

// Test de connexion
(async () => {
  try {
    const res = await query("SELECT NOW()");
    console.log("DB connection successful:", res.rows[0].now);
  } catch (error) {
    console.error("DB connection error:", error.message);
  }
})();

const runMigration = async (sql) => {
  try {
    await query(sql);
  } catch (e) {
    console.warn("Migration warning (non-fatal):", e.message);
  }
};

const initializeDB = async () => {
  try {
    const sqlPath = path.join(__dirname, "table.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");
    await query(sql);

    // -- Migrations idempotentes pour bases existantes --
    await runMigration(`ALTER TABLE cours ADD COLUMN IF NOT EXISTS promotion university_promotion`);
    await runMigration(`ALTER TABLE cours ADD COLUMN IF NOT EXISTS professor_id INT`);
    await runMigration(`ALTER TABLE cours ADD COLUMN IF NOT EXISTS credits INT DEFAULT 0`);
    await runMigration(`ALTER TABLE profs ADD COLUMN IF NOT EXISTS sexe VARCHAR(50) DEFAULT 'masculin'`);
    await runMigration(`ALTER TABLE profs ADD COLUMN IF NOT EXISTS date_naissance DATE`);
    await runMigration(`ALTER TABLE profs ADD COLUMN IF NOT EXISTS etat_civil VARCHAR(50)`);
    await runMigration(`ALTER TABLE profs ADD COLUMN IF NOT EXISTS profession VARCHAR(255)`);
    await runMigration(`ALTER TABLE profs ADD COLUMN IF NOT EXISTS telephone VARCHAR(50)`);
    await runMigration(`ALTER TABLE profs ADD COLUMN IF NOT EXISTS password VARCHAR(255)`);
    await runMigration(`ALTER TABLE profs ADD COLUMN IF NOT EXISTS matricule VARCHAR(255)`);

    await runMigration(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profs_matricule_key') THEN
          ALTER TABLE profs ADD CONSTRAINT profs_matricule_key UNIQUE (matricule);
        END IF;
      END $$;
    `);
    await runMigration(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cours_professor_id_fkey') THEN
          ALTER TABLE cours ADD CONSTRAINT cours_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES profs(id);
        END IF;
      END $$;
    `);

    await runMigration(`ALTER TABLE traitement_recours ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE`);
    await runMigration(`ALTER TABLE traitement_recours ADD COLUMN IF NOT EXISTS admin_id INT REFERENCES users(id) ON DELETE SET NULL`);
    await runMigration(`ALTER TABLE recours ADD COLUMN IF NOT EXISTS assigned_to_prof BOOLEAN DEFAULT FALSE`);
    await runMigration(`ALTER TABLE recours ADD COLUMN IF NOT EXISTS annee_universitaire VARCHAR(50)`);
    await runMigration(`ALTER TABLE periode_recours ADD COLUMN IF NOT EXISTS department VARCHAR(255)`);

    // Make professeur_id and userId nullable in traitement_recours (admin-only treatments have no prof)
    await runMigration(`ALTER TABLE traitement_recours ALTER COLUMN professeur_id DROP NOT NULL`);
    // await runMigration(`ALTER TABLE traitement_recours ALTER COLUMN userId DROP NOT NULL`);

    // Create recours_cours junction table
    await runMigration(`
      CREATE TABLE IF NOT EXISTS recours_cours (
        id SERIAL PRIMARY KEY,
        recours_id INT NOT NULL REFERENCES recours(id) ON DELETE CASCADE,
        course_id INT NOT NULL REFERENCES cours(id),
        evaluation type_evaluation NOT NULL,
        piece_jointe VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add recours_cours_id FK on traitement_recours
    await runMigration(`ALTER TABLE traitement_recours ADD COLUMN IF NOT EXISTS recours_cours_id INT`);
    await runMigration(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'traitement_recours_recours_cours_id_fkey') THEN
          ALTER TABLE traitement_recours ADD CONSTRAINT traitement_recours_recours_cours_id_fkey
            FOREIGN KEY (recours_cours_id) REFERENCES recours_cours(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Backfill recours_cours from legacy recours rows that still have course_id column
    await runMigration(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recours' AND column_name='course_id') THEN
          INSERT INTO recours_cours (recours_id, course_id, evaluation, piece_jointe, created_at)
          SELECT r.id, r.course_id, r.evaluation::type_evaluation, r.piece_jointe, r.created_at
          FROM recours r
          WHERE r.course_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM recours_cours rc WHERE rc.recours_id = r.id
            )
          ON CONFLICT DO NOTHING;
        END IF;
      END $$;
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("DB initialization error:", error.message);
  }
};

initializeDB();

module.exports = { query };
