DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'coach', 'athlete');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
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

CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  coach_id BIGINT NOT NULL REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_coach_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_active_email_key
  ON users (email)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS folders_active_author_title_key
  ON folders (author_id, LOWER(title))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS groups_active_coach_name_key
  ON groups (coach_id, LOWER(name))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS athlete_groups (
  id BIGSERIAL PRIMARY KEY,
  athlete_id BIGINT NOT NULL REFERENCES users(id),
  group_id BIGINT NOT NULL REFERENCES groups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (athlete_id, group_id)
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

CREATE TABLE IF NOT EXISTS group_training (
  id BIGSERIAL PRIMARY KEY,
  coach_id BIGINT NOT NULL REFERENCES users(id),
  group_id BIGINT NOT NULL REFERENCES groups(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS athlete_training (
  id BIGSERIAL PRIMARY KEY,
  group_training_id BIGINT REFERENCES group_training(id),
  coach_id BIGINT NOT NULL REFERENCES users(id),
  athlete_id BIGINT NOT NULL REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS training_item (
  id BIGSERIAL PRIMARY KEY,
  athlete_training_id BIGINT NOT NULL REFERENCES athlete_training(id),
  exercise_id BIGINT NOT NULL REFERENCES exercise(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  target_attempts INTEGER,
  result_attempts INTEGER,
  result_successes INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

WITH seed_users AS (
  INSERT INTO users (email, password_hash, name, role)
  VALUES
    (
      'admin@example.com',
      '$2b$12$oiuBfn8HkXyYxNqr8k0mT.uvc7oYanCGfklqCvQgmMyq1XUy6Pzse',
      'Admin User',
      'admin'
    ),
    (
      'coach@example.com',
      '$2b$12$oiuBfn8HkXyYxNqr8k0mT.uvc7oYanCGfklqCvQgmMyq1XUy6Pzse',
      'Coach User',
      'coach'
    ),
    (
      'stas.dementev@example.com',
      '$2b$12$ivhM8SmewZH7r97Sny/Y5u7n7ecSkv3wmuz5UMs9BvCuiVqLoNZSu',
      'Стас Деменьтьев',
      'coach'
    )
  ON CONFLICT (email) WHERE deleted_at IS NULL DO UPDATE
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
),
seed_athletes AS (
  INSERT INTO users (email, password_hash, name, role, coach_id)
  SELECT
    athlete.email,
    '$2b$12$oiuBfn8HkXyYxNqr8k0mT.uvc7oYanCGfklqCvQgmMyq1XUy6Pzse',
    athlete.name,
    'athlete',
    seed_coach.id
  FROM seed_coach
  CROSS JOIN (
    VALUES
      ('athlete@example.com', 'Athlete User'),
      ('athlete2@example.com', 'Athlete Two'),
      ('athlete3@example.com', 'Athlete Three')
  ) AS athlete(email, name)
  ON CONFLICT (email) WHERE deleted_at IS NULL DO UPDATE
  SET
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    coach_id = EXCLUDED.coach_id,
    updated_at = now(),
    deleted_at = NULL
  RETURNING id, email
),
seed_group AS (
  INSERT INTO groups (name, coach_id, description)
  SELECT
    'Junior A',
    id,
    'Seed training group'
  FROM seed_coach
  ON CONFLICT DO NOTHING
  RETURNING id
),
seed_group_resolved AS (
  SELECT id FROM seed_group
  UNION
  SELECT groups.id
  FROM groups
  JOIN seed_coach ON groups.coach_id = seed_coach.id
  WHERE groups.name = 'Junior A'
)
INSERT INTO athlete_groups (athlete_id, group_id)
SELECT
  seed_athletes.id,
  seed_group_resolved.id
FROM seed_athletes
CROSS JOIN seed_group_resolved
ON CONFLICT (athlete_id, group_id) DO UPDATE
SET
  deleted_at = NULL;
