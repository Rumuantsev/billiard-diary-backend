const pool = require("../db");

// POST /positions
exports.createPosition = async (req, res) => {
  try {
    const { layout, power } = req.body;

    const result = await pool.query(
      "INSERT INTO position(layout, power) VALUES($1, $2) RETURNING id",
      [layout, power],
    );

    return res.status(201).json({
      ok: true,
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("POST /positions error", err);
    return res.status(500).json({ ok: false, error: "db error" });
  }
};

// GET /positions
exports.getPositions = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM position ORDER BY id DESC LIMIT 100",
    );

    return res.json({
      ok: true,
      positions: result.rows,
    });
  } catch (err) {
    console.error("GET /positions error", err);
    return res.status(500).json({
      ok: false,
      error: "db error",
    });
  }
};

// GET /positions/:id
exports.getPositionById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM position WHERE id = $1", [
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        error: "not found",
      });
    }

    return res.json({
      ok: true,
      position: result.rows[0],
    });
  } catch (err) {
    console.error("GET /positions/:id error", err);
    return res.status(500).json({
      ok: false,
      error: "db error",
    });
  }
};

// PUT /positions/:id
exports.updatePosition = async (req, res) => {
  const { id } = req.params;
  const { layout, power } = req.body;

  try {
    const result = await pool.query(
      "UPDATE position SET layout = $1, power = $2, updated_at = now() WHERE id = $3 RETURNING id",
      [layout, power, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "not found" });
    }

    return res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("PUT /positions/:id error", err);
    return res.status(500).json({ ok: false, error: "db error" });
  }
};

// DELETE /positions/:id
exports.deletePosition = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM position WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        error: "not found",
      });
    }

    return res.status(204).json({
      ok: true,
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("DELETE /positions/:id error", err);
    return res.status(500).json({
      ok: false,
      error: "db error",
    });
  }
};
