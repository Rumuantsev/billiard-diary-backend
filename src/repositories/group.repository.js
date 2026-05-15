const pool = require("../db");

const groupColumns =
  "id, name, coach_id, description, created_at, updated_at, deleted_at";

const athleteColumns =
  "users.id, users.email, users.name, users.role, users.coach_id, users.created_at, users.updated_at, users.deleted_at";

const withTransaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const createGroup = async ({ name, description, coachId, athleteIds }) =>
  withTransaction(async (client) => {
    const groupResult = await client.query(
      `INSERT INTO groups(name, coach_id, description)
       VALUES($1, $2, $3)
       RETURNING ${groupColumns}`,
      [name, coachId, description ?? null],
    );

    const group = groupResult.rows[0];

    if (athleteIds.length > 0) {
      await client.query(
        `INSERT INTO athlete_groups(athlete_id, group_id)
         SELECT unnest($1::bigint[]), $2
         ON CONFLICT (athlete_id, group_id) DO UPDATE
         SET deleted_at = NULL`,
        [athleteIds, group.id],
      );
    }

    return group;
  });

const findGroups = async ({ coachId }) => {
  const result = await pool.query(
    `SELECT groups.id,
            groups.name,
            groups.coach_id,
            groups.description,
            groups.created_at,
            groups.updated_at,
            groups.deleted_at,
            COUNT(athlete_groups.id)::int AS athletes_count
     FROM groups
     LEFT JOIN athlete_groups ON athlete_groups.group_id = groups.id
       AND athlete_groups.deleted_at IS NULL
     WHERE groups.coach_id = $1 AND groups.deleted_at IS NULL
     GROUP BY
       groups.id,
       groups.name,
       groups.coach_id,
       groups.description,
       groups.created_at,
       groups.updated_at,
       groups.deleted_at
     ORDER BY groups.id ASC`,
    [coachId],
  );

  return result.rows;
};

const findGroupById = async (id, { coachId } = {}) => {
  const values = [id];
  const where = ["id = $1", "deleted_at IS NULL"];

  if (coachId) {
    values.push(coachId);
    where.push(`coach_id = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT ${groupColumns}
     FROM groups
     WHERE ${where.join(" AND ")}`,
    values,
  );

  return result.rows[0] ?? null;
};

const findGroupAthletes = async (groupId) => {
  const result = await pool.query(
    `SELECT ${athleteColumns}
     FROM athlete_groups
     JOIN users ON users.id = athlete_groups.athlete_id
       AND users.deleted_at IS NULL
     WHERE athlete_groups.group_id = $1
       AND athlete_groups.deleted_at IS NULL
     ORDER BY users.id ASC`,
    [groupId],
  );

  return result.rows;
};

const updateGroup = async (id, data, { coachId }) => {
  const entries = Object.entries({
    name: data.name,
    description: data.description,
  }).filter(([, value]) => value !== undefined);

  const values = [];
  const setClauses = entries.map(([column, value]) => {
    values.push(value);
    return `${column} = $${values.length}`;
  });

  values.push(id);
  const idParam = `$${values.length}`;
  values.push(coachId);
  const coachParam = `$${values.length}`;

  const result = await pool.query(
    `UPDATE groups
     SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = ${idParam} AND coach_id = ${coachParam} AND deleted_at IS NULL
     RETURNING ${groupColumns}`,
    values,
  );

  return result.rows[0] ?? null;
};

const softDeleteGroup = async (id, { coachId }) => {
  const result = await pool.query(
    `UPDATE groups
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND coach_id = $2 AND deleted_at IS NULL
     RETURNING ${groupColumns}`,
    [id, coachId],
  );

  return result.rows[0] ?? null;
};

const addAthlete = async ({ groupId, athleteId }) => {
  const result = await pool.query(
    `INSERT INTO athlete_groups(athlete_id, group_id)
     VALUES($1, $2)
     ON CONFLICT (athlete_id, group_id) DO UPDATE
     SET deleted_at = NULL
     RETURNING id, athlete_id, group_id, created_at, deleted_at`,
    [athleteId, groupId],
  );

  return result.rows[0];
};

const removeAthlete = async ({ groupId, athleteId }) => {
  const result = await pool.query(
    `UPDATE athlete_groups
     SET deleted_at = now()
     WHERE athlete_id = $1 AND group_id = $2 AND deleted_at IS NULL
     RETURNING id, athlete_id, group_id, created_at, deleted_at`,
    [athleteId, groupId],
  );

  return result.rows[0] ?? null;
};

module.exports = {
  createGroup,
  findGroups,
  findGroupById,
  findGroupAthletes,
  updateGroup,
  softDeleteGroup,
  addAthlete,
  removeAthlete,
};
