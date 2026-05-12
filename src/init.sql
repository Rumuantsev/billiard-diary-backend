DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'coach', 'athlete');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  coach_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT users_coach_id_role_check CHECK (
    (role = 'athlete' AND coach_id IS NOT NULL)
    OR (role IN ('admin', 'coach') AND coach_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS folders (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS exercise (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position JSONB,
  author_id BIGINT REFERENCES users(id),
  folder_id BIGINT REFERENCES folders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

WITH seed_users AS (
  INSERT INTO users (email, password_hash, name, role)
  VALUES
    (
      'admin@example.com',
      '$2b$12$MpFvY2r9X3lxswgSa9M3vuAoiD4lg.arjzclMcLiMmEQbBJV0jEOS',
      'Admin User',
      'admin'
    ),
    (
      'coach@example.com',
      '$2b$12$MpFvY2r9X3lxswgSa9M3vuAoiD4lg.arjzclMcLiMmEQbBJV0jEOS',
      'Coach User',
      'coach'
    )
  ON CONFLICT (email) DO UPDATE
  SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    coach_id = NULL,
    updated_at = now(),
    deleted_at = NULL
  RETURNING id, email
),
seed_coach AS (
  SELECT id
  FROM seed_users
  WHERE email = 'coach@example.com'
  UNION
  SELECT id
  FROM users
  WHERE email = 'coach@example.com'
)
INSERT INTO users (email, password_hash, name, role, coach_id)
SELECT
  'athlete@example.com',
  '$2b$12$MpFvY2r9X3lxswgSa9M3vuAoiD4lg.arjzclMcLiMmEQbBJV0jEOS',
  'Athlete User',
  'athlete',
  id
FROM seed_coach
LIMIT 1
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  coach_id = EXCLUDED.coach_id,
  updated_at = now(),
  deleted_at = NULL;
