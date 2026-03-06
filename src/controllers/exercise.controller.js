const pool = require("../db");

exports.createExercise = async (req, res) => {
  try {
    const { title, description, position } = req.body;
    const result = await pool.query(
      "INSERT INTO exercise(title, description, position) VALUES($1, $2, $3) RETURNING id",
      [title, description, position],
    );
    res.status(201).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("POST /exercises error", err);
    res.status(500).json({ ok: false, error: "db error" });
  }
};

exports.getExercises = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM exercise ORDER BY id DESC LIMIT 100",
    );
    res.json({ ok: true, exercises: result.rows });
  } catch (err) {
    console.error("GET /exercises error", err);
    res.status(500).json({ ok: false, error: "db error" });
  }
};

exports.getExerciseById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM exercise WHERE id = $1", [
      id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, exercise: result.rows[0] });
  } catch (err) {
    console.error("GET /exercises/:id error", err);
    res.status(500).json({ ok: false, error: "db error" });
  }
};

exports.updateExercise = async (req, res) => {
  const { id } = req.params;
  const { title, description, position } = req.body;
  try {
    const result = await pool.query(
      "UPDATE exercise SET title=$1, description=$2, position=$3, updated_at=now() WHERE id=$4 RETURNING id",
      [title, description, position, id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("PUT /exercises/:id error", err);
    res.status(500).json({ ok: false, error: "db error" });
  }
};

exports.deleteExercise = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM exercise WHERE id=$1 RETURNING id",
      [id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ ok: false, error: "not found" });
    res.status(204).json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /exercises/:id error", err);
    res.status(500).json({ ok: false, error: "db error" });
  }
};
