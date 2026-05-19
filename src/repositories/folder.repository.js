const pool = require("../db");

const folderColumns =
  "id, title, author_id, created_at, updated_at, deleted_at";

const createFolder = async ({ title, authorId }) => {
  const result = await pool.query(
    `INSERT INTO folders(title, author_id)
     VALUES($1, $2)
     RETURNING ${folderColumns}`,
    [title, authorId],
  );

  return result.rows[0];
};

const findFolders = async ({ authorId }) => {
  const values = [];
  const where = ["deleted_at IS NULL"];

  if (authorId) {
    values.push(authorId);
    where.push(`author_id = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT ${folderColumns}
     FROM folders
     WHERE ${where.join(" AND ")}
     ORDER BY title ASC, id ASC`,
    values,
  );

  return result.rows;
};

const findFolderById = async (id, { authorId } = {}) => {
  const values = [id];
  const where = ["id = $1", "deleted_at IS NULL"];

  if (authorId) {
    values.push(authorId);
    where.push(`author_id = $${values.length}`);
  }

  const result = await pool.query(
    `SELECT ${folderColumns}
     FROM folders
     WHERE ${where.join(" AND ")}`,
    values,
  );

  return result.rows[0] ?? null;
};

const updateFolder = async (id, data, { authorId } = {}) => {
  const entries = Object.entries({
    title: data.title,
  }).filter(([, value]) => value !== undefined);

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
    `UPDATE folders
     SET ${setClauses.join(", ")}, updated_at = now()
     WHERE ${where.join(" AND ")}
     RETURNING ${folderColumns}`,
    values,
  );

  return result.rows[0] ?? null;
};

const softDeleteFolder = async (id, { authorId } = {}) => {
  const values = [id];
  const where = ["id = $1", "deleted_at IS NULL"];

  if (authorId) {
    values.push(authorId);
    where.push(`author_id = $${values.length}`);
  }

  const result = await pool.query(
    `UPDATE folders
     SET deleted_at = now(), updated_at = now()
     WHERE ${where.join(" AND ")}
     RETURNING ${folderColumns}`,
    values,
  );

  return result.rows[0] ?? null;
};

module.exports = {
  createFolder,
  findFolderById,
  findFolders,
  softDeleteFolder,
  updateFolder,
};
