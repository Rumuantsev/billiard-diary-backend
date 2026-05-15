const pool = require("../db");

const toDbFields = (exercise) => ({
  title: exercise.title,
  description: exercise.description,
  position: exercise.position,
  author_id: exercise.authorId,
  folder_id: exercise.folderId,
});

const createExercise = async (exercise) => {
  const fields = toDbFields(exercise);
  const result = await pool.query(
    `INSERT INTO exercise(title, description, position, author_id, folder_id)
     VALUES($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      fields.title,
      fields.description ?? null,
      fields.position ?? null,
      fields.author_id ?? null,
      fields.folder_id ?? null,
    ],
  );

  return result.rows[0];
};

const buildExerciseFilters = ({ search, folderId, authorId }) => {
  const values = [];
  const where = ["deleted_at IS NULL"];

  if (search) {
    values.push(`%${search}%`);
    where.push(`title ILIKE $${values.length}`);
  }

  if (folderId) {
    values.push(folderId);
    where.push(`folder_id = $${values.length}`);
  }

  if (authorId) {
    values.push(authorId);
    where.push(`author_id = $${values.length}`);
  }

  return { values, where };
};

const findExercises = async ({ search, folderId, authorId, limit, offset }) => {
  const { values, where } = buildExerciseFilters({
    search,
    folderId,
    authorId,
  });

  values.push(limit);
  const limitParam = `$${values.length}`;
  values.push(offset);
  const offsetParam = `$${values.length}`;

  const result = await pool.query(
    `SELECT *
     FROM exercise
     WHERE ${where.join(" AND ")}
     ORDER BY id DESC
     LIMIT ${limitParam}
     OFFSET ${offsetParam}`,
    values,
  );

  return result.rows;
};

const countExercises = async ({ search, folderId, authorId }) => {
  const { values, where } = buildExerciseFilters({
    search,
    folderId,
    authorId,
  });

  const result = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM exercise
     WHERE ${where.join(" AND ")}`,
    values,
  );

  return result.rows[0].total;
};

const findExerciseById = async (id, { authorId } = {}) => {
  const values = [id];
  const where = ["id = $1", "deleted_at IS NULL"];

  if (authorId) {
    values.push(authorId);
    where.push(`author_id = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT *
     FROM exercise
     WHERE ${where.join(" AND ")}`,
    values,
  );

  return result.rows[0] ?? null;
};

const findActiveExercisesByIds = async (ids, { authorId } = {}) => {
  if (ids.length === 0) {
    return [];
  }

  const values = [ids];
  const where = ["id = ANY($1::bigint[])", "deleted_at IS NULL"];

  if (authorId) {
    values.push(authorId);
    where.push(`author_id = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT *
     FROM exercise
     WHERE ${where.join(" AND ")}`,
    values,
  );

  return result.rows;
};

const updateExercise = async (id, exercise, { authorId } = {}) => {
  const fields = toDbFields(exercise);
  const entries = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );

  const values = [];
  const setClauses = entries.map(([column, value]) => {
    values.push(value);
    return `${column} = $${values.length}`;
  });

  values.push(id);
  const idParam = `$${values.length}`;

  const where = [`id = ${idParam}`, "deleted_at IS NULL"];
  if (authorId) {
    values.push(authorId);
    where.push(`author_id = $${values.length}`);
  }

  const result = await pool.query(
    `UPDATE exercise
     SET ${setClauses.join(", ")}, updated_at = now()
     WHERE ${where.join(" AND ")}
     RETURNING *`,
    values,
  );

  return result.rows[0] ?? null;
};

const softDeleteExercise = async (id, { authorId } = {}) => {
  const values = [id];
  const where = ["id = $1", "deleted_at IS NULL"];

  if (authorId) {
    values.push(authorId);
    where.push(`author_id = $${values.length}`);
  }

  const result = await pool.query(
    `UPDATE exercise
     SET deleted_at = now(), updated_at = now()
     WHERE ${where.join(" AND ")}
     RETURNING *`,
    values,
  );

  return result.rows[0] ?? null;
};

module.exports = {
  createExercise,
  countExercises,
  findExercises,
  findExerciseById,
  findActiveExercisesByIds,
  updateExercise,
  softDeleteExercise,
};
