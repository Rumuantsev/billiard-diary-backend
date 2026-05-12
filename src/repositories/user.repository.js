const pool = require("../db");

const publicUserColumns =
  "id, email, name, role, coach_id, created_at, updated_at, deleted_at";

const countActiveUsers = async () => {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL",
  );

  return result.rows[0].count;
};

const createUser = async ({ email, passwordHash, name, role, coachId }) => {
  const result = await pool.query(
    `INSERT INTO users(email, password_hash, name, role, coach_id)
     VALUES($1, $2, $3, $4, $5)
     RETURNING ${publicUserColumns}`,
    [email, passwordHash, name, role, coachId ?? null],
  );

  return result.rows[0];
};

const findUserByEmailWithPassword = async (email) => {
  const result = await pool.query(
    `SELECT id, email, password_hash, name, role, coach_id, created_at, updated_at, deleted_at
     FROM users
     WHERE email = $1 AND deleted_at IS NULL`,
    [email],
  );

  return result.rows[0] ?? null;
};

const findUserById = async (id) => {
  const result = await pool.query(
    `SELECT ${publicUserColumns}
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  );

  return result.rows[0] ?? null;
};

module.exports = {
  countActiveUsers,
  createUser,
  findUserByEmailWithPassword,
  findUserById,
};
