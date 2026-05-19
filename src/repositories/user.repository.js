const pool = require("../db");

const publicUserColumns =
  "id, email, name, role, coach_id, created_at, updated_at, deleted_at";
const publicUserSelectColumns =
  "users.id, users.email, users.name, users.role, users.coach_id, users.created_at, users.updated_at, users.deleted_at";

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

const updateUser = async (id, data) => {
  const entries = Object.entries({
    email: data.email,
    name: data.name,
    password_hash: data.passwordHash,
  }).filter(([, value]) => value !== undefined);

  const values = [];
  const setClauses = entries.map(([column, value]) => {
    values.push(value);
    return `${column} = $${values.length}`;
  });

  values.push(id);
  const idParam = `$${values.length}`;

  const result = await pool.query(
    `UPDATE users
     SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = ${idParam} AND deleted_at IS NULL
     RETURNING ${publicUserColumns}`,
    values,
  );

  return result.rows[0] ?? null;
};

const softDeleteUser = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE users
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING ${publicUserColumns}`,
      [id],
    );

    const user = result.rows[0] ?? null;
    if (!user) {
      await client.query("ROLLBACK");
      return null;
    }

    if (user.role === "athlete") {
      await client.query(
        `UPDATE athlete_groups
         SET deleted_at = now()
         WHERE athlete_id = $1 AND deleted_at IS NULL`,
        [id],
      );
    }

    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const findUsers = async ({ role, groupId, currentUser }) => {
  const values = [];
  const where = ["users.deleted_at IS NULL"];
  let join = "";

  if (role) {
    values.push(role);
    where.push(`users.role = $${values.length}`);
  }

  if (groupId) {
    join = `
      JOIN athlete_groups ON athlete_groups.athlete_id = users.id
        AND athlete_groups.deleted_at IS NULL
      JOIN groups ON groups.id = athlete_groups.group_id
        AND groups.deleted_at IS NULL`;

    values.push(groupId);
    where.push(`groups.id = $${values.length}`);
  }

  if (currentUser.role === "coach") {
    if (role === "coach") {
      values.push(currentUser.id);
      where.push(`users.id = $${values.length}`);
    } else {
      where.push("users.role = 'athlete'");
      values.push(currentUser.id);
      where.push(`users.coach_id = $${values.length}`);
    }
  }

  const result = await pool.query(
    `SELECT DISTINCT ${publicUserSelectColumns}
     FROM users
     ${join}
     WHERE ${where.join(" AND ")}
     ORDER BY users.id ASC`,
    values,
  );

  return result.rows;
};

const findCoachAthletesByIds = async (coachId, athleteIds) => {
  if (athleteIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT ${publicUserSelectColumns}
     FROM users
     WHERE id = ANY($1::bigint[])
       AND role = 'athlete'
       AND coach_id = $2
       AND deleted_at IS NULL`,
    [athleteIds, coachId],
  );

  return result.rows;
};

module.exports = {
  countActiveUsers,
  createUser,
  findUserByEmailWithPassword,
  findUserById,
  findUsers,
  findCoachAthletesByIds,
  softDeleteUser,
  updateUser,
};
