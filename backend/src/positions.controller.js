// src/positions.controller.js
const express = require("express");
const router = express.Router();
const pool = require("./db");

// Простая встроенная валидация контракта data
function validateData(data) {
  const errors = [];
  if (typeof data !== "object" || data === null) {
    errors.push("data must be an object");
    return { valid: false, errors };
  }
  if (!("balls" in data)) {
    errors.push("data.balls is required (array)");
    return { valid: false, errors };
  }
  if (!Array.isArray(data.balls)) {
    errors.push("data.balls must be an array");
    return { valid: false, errors };
  }
  data.balls.forEach((b, i) => {
    if (typeof b !== "object" || b === null) {
      errors.push(`balls[${i}] must be an object`);
      return;
    }
    if (typeof b.x !== "number" || typeof b.y !== "number") {
      errors.push(`balls[${i}] must have numeric x and y`);
    }
    // type is optional but if present must be string
    if ("type" in b && typeof b.type !== "string") {
      errors.push(`balls[${i}].type must be string`);
    }
  });
  // lines optional check
  if ("lines" in data) {
    if (!Array.isArray(data.lines)) {
      errors.push("data.lines must be an array if provided");
    } else {
      data.lines.forEach((l, i) => {
        if (!l.from || !l.to) {
          errors.push(`lines[${i}] must have from and to`);
        } else {
          if (typeof l.from.x !== "number" || typeof l.from.y !== "number") {
            errors.push(`lines[${i}].from.x/y must be numbers`);
          }
          if (typeof l.to.x !== "number" || typeof l.to.y !== "number") {
            errors.push(`lines[${i}].to.x/y must be numbers`);
          }
        }
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

// POST /positions
router.post("/", async (req, res) => {
  const data = req.body.data;
  const { valid, errors } = validateData(data);
  if (!valid) return res.status(400).json({ ok: false, errors });

  try {
    const result = await pool.query(
      "INSERT INTO position(data) VALUES($1) RETURNING id",
      [data],
    );
    return res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("POST /positions error", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

// GET /positions  (list minimal)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM position ORDER BY id DESC LIMIT 100",
    );
    return res.json({ ok: true, positions: result.rows });
  } catch (err) {
    console.error("GET /positions error", err);
    return res.status(500).json({ ok: false, error: "db error" });
  }
});

// GET /positions/:id
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM position WHERE id = $1", [
      id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({ ok: false, error: "not found" });
    return res.json({ ok: true, position: result.rows[0] });
  } catch (err) {
    console.error("GET /positions/:id error", err);
    return res.status(500).json({ ok: false, error: "db error" });
  }
});

// PUT /positions/:id
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const data = req.body.data;
  const { valid, errors } = validateData(data);
  if (!valid) return res.status(400).json({ ok: false, errors });

  try {
    const result = await pool.query(
      "UPDATE position SET data = $1, updated_at = now() WHERE id = $2 RETURNING id",
      [data, id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ ok: false, error: "not found" });
    return res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("PUT /positions/:id error", err);
    return res.status(500).json({ ok: false, error: "db error" });
  }
});

// DELETE /positions/:id
router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query(
      "DELETE FROM position WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ ok: false, error: "not found" });
    return res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /positions/:id error", err);
    return res.status(500).json({ ok: false, error: "db error" });
  }
});

module.exports = router;
