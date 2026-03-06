const express = require("express");
const router = express.Router();

const validate = require("../middlewares/validate");
const exerciseSchema = require("../schemas/exercise.schema");
const controller = require("../controllers/exercise.controller");

router.post("/", validate(exerciseSchema), controller.createExercise);
router.get("/", controller.getExercises);
router.get("/:id", controller.getExerciseById);
router.put("/:id", validate(exerciseSchema), controller.updateExercise);
router.delete("/:id", controller.deleteExercise);

module.exports = router;
