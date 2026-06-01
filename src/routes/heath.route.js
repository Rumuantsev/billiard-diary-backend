const express = require("express");
const router = express.Router();

const pool = require("../db");
const asyncHandler = require("../middlewares/asyncHandler");

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT id, name, description, created_at
       FROM groups
       WHERE deleted_at IS NULL
       ORDER BY id DESC
       LIMIT 20`,
    );

    res.json({
      ok: true,
      entity: "groups",
      items: result.rows.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        createdAt: group.created_at,
      })),
    });
  }),
);

module.exports = router;
