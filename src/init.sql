CREATE TABLE IF NOT EXISTS exercise (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  position JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);