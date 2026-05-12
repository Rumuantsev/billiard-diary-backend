const express = require("express");
const router = express.Router();

const {
  authenticate,
  authorizeRoles,
} = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createExerciseSchema,
  updateExerciseSchema,
  exerciseQuerySchema,
  idParamSchema,
} = require("../schemas/exercise.schema");
const controller = require("../controllers/exercise.controller");

router.use(authenticate);

router.post(
  "/",
  authorizeRoles("admin", "coach"),
  validate(createExerciseSchema),
  controller.createExercise,
);
router.get("/", validate(exerciseQuerySchema, "query"), controller.getExercises);
router.get(
  "/:id",
  validate(idParamSchema, "params"),
  controller.getExerciseById,
);
router.put(
  "/:id",
  validate(idParamSchema, "params"),
  authorizeRoles("admin", "coach"),
  validate(updateExerciseSchema),
  controller.updateExercise,
);
router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  authorizeRoles("admin", "coach"),
  controller.deleteExercise,
);

module.exports = router;
