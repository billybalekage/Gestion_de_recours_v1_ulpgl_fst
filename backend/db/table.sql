DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role') THEN
        CREATE TYPE users_role AS ENUM ('admin','enseignant', 'etudiant');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'university_promotion') THEN
        CREATE TYPE university_promotion AS ENUM ('L1','L2','L3','M1','M2');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'university_department') THEN
        CREATE TYPE university_department AS ENUM ('genie_informatique','genie_mecanique','genie_civil','genie_electrique');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recours_status') THEN
        CREATE TYPE recours_status AS ENUM ('en_attente', 'en_cours', 'traite_prof', 'publie', 'accepte', 'refuse');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_evaluation') THEN
        CREATE TYPE type_evaluation AS ENUM ('tp', 'td', 'interrogation', 'examen');
    END IF;
END$$;

-- Safely add missing enum values to recours_status if it already exists from an older schema
DO $$
BEGIN
    -- Add new workflow statuses if they don't exist yet
    BEGIN ALTER TYPE recours_status ADD VALUE IF NOT EXISTS 'en_cours'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE recours_status ADD VALUE IF NOT EXISTS 'traite_prof'; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER TYPE recours_status ADD VALUE IF NOT EXISTS 'publie'; EXCEPTION WHEN others THEN NULL; END;
END$$;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role users_role DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS etudiants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    postnom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    sexe VARCHAR(50) NOT NULL DEFAULT 'masculin',
    telephone VARCHAR(50) NOT NULL,
    date_naissance DATE,
    matricule VARCHAR(255) NOT NULL UNIQUE,
    promotion university_promotion NOT NULL,
    department university_department NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),
    role users_role NOT NULL DEFAULT 'etudiant',
    user_id INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    postnom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    matricule VARCHAR(255) NOT NULL UNIQUE,
    department university_department NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    sexe VARCHAR(50) DEFAULT 'masculin',
    date_naissance DATE,
    etat_civil VARCHAR(50),
    profession VARCHAR(255),
    telephone VARCHAR(50),
    password VARCHAR(255),
    role users_role NOT NULL DEFAULT 'enseignant',
    user_id INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cours (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    department university_department NOT NULL,
    promotion university_promotion NOT NULL,
    professor_id INT NOT NULL REFERENCES profs(id),
    credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main recours table: one recours per student submission (can cover multiple courses)
CREATE TABLE IF NOT EXISTS recours (
    id SERIAL PRIMARY KEY,
    objet VARCHAR(255) NOT NULL,
    description TEXT,
    etudiant_id INT NOT NULL REFERENCES etudiants(id),
    annee_universitaire VARCHAR(50),
    status recours_status DEFAULT 'en_attente',
    assigned_to_prof BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table: one row per course+evaluation type within a recours
-- piece_jointe is mandatory for tp/td/interrogation, optional for examen
CREATE TABLE IF NOT EXISTS recours_cours (
    id SERIAL PRIMARY KEY,
    recours_id INT NOT NULL REFERENCES recours(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES cours(id),
    evaluation type_evaluation NOT NULL,
    piece_jointe VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    matricule VARCHAR(50) NOT NULL REFERENCES etudiants(matricule) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES cours(id) ON DELETE CASCADE,
    note_tp FLOAT DEFAULT NULL,
    note_td FLOAT DEFAULT NULL,
    note_interrogation FLOAT DEFAULT NULL,
    note_examen FLOAT DEFAULT NULL,
    annee_universitaire VARCHAR(9) NOT NULL,
    semestre INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_matricule_cours_annee UNIQUE (matricule, course_id, annee_universitaire)
);

-- traitement_recours: stores decisions by prof or admin
-- admin_id tracks which admin sent it to the prof (so prof can send back to same admin)
CREATE TABLE IF NOT EXISTS traitement_recours (
    id SERIAL PRIMARY KEY,
    recours_id INT NOT NULL REFERENCES recours(id) ON DELETE CASCADE,
    recours_cours_id INT REFERENCES recours_cours(id) ON DELETE SET NULL,
    professeur_id INT REFERENCES profs(id) ON DELETE CASCADE,
    admin_id INT REFERENCES users(id) ON DELETE SET NULL,
    decision recours_status NOT NULL,
    motif TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS periode_recours (
    id SERIAL PRIMARY KEY,
    annee_universitaire VARCHAR(9) NOT NULL,
    semestre INT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    promotion university_promotion NOT NULL,
    department VARCHAR(255),
    CONSTRAINT chk_dates CHECK (date_fin >= date_debut),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS periode_cours (
    periode_id INT NOT NULL REFERENCES periode_recours(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES cours(id) ON DELETE CASCADE,
    PRIMARY KEY (periode_id, course_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configuration (
    id SERIAL PRIMARY KEY,
    annee_universitaire_active VARCHAR(20) NOT NULL,
    est_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    etudiant_id INT NOT NULL REFERENCES etudiants(id) ON DELETE CASCADE,
    traitement_id INT REFERENCES traitement_recours(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
