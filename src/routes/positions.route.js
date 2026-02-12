const express = require("express");
const router = express.Router();

const validate = require("../middlewares/validate");
const positionSchema = require("../schemas/position.schema");

const controller = require("../controllers/positions.controller");

// POST
router.post("/", validate(positionSchema), controller.createPosition);

// GET all
router.get("/", controller.getPositions);

// GET by id
router.get("/:id", controller.getPositionById);

// PUT
router.put("/:id", validate(positionSchema), controller.updatePosition);

// DELETE
router.delete("/:id", controller.deletePosition);

module.exports = router;
