const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  addTrainingItemSchema,
  createTrainingSchema,
  idParamSchema,
  itemParamSchema,
  trainingQuerySchema,
  updateAthleteTrainingSchema,
  updateGroupTrainingSchema,
  updateTrainingItemResultSchema,
  updateTrainingItemSchema,
  updateTrainingItemStatusSchema,
  updateTrainingStatusSchema,
} = require("../schemas/training.schema");
const controller = require("../controllers/training.controller");

router.use(authenticate);

router.post("/", validate(createTrainingSchema), controller.createTraining);
router.get("/", validate(trainingQuerySchema, "query"), controller.getTrainings);
router.get(
  "/group/:id",
  validate(idParamSchema, "params"),
  controller.getGroupTrainingById,
);
router.patch(
  "/group/:id",
  validate(idParamSchema, "params"),
  validate(updateGroupTrainingSchema),
  controller.updateGroupTraining,
);
router.delete(
  "/group/:id",
  validate(idParamSchema, "params"),
  controller.deleteGroupTraining,
);
router.patch(
  "/group/:id/status",
  validate(idParamSchema, "params"),
  validate(updateTrainingStatusSchema),
  controller.updateGroupTrainingStatus,
);
router.get(
  "/athlete/:id",
  validate(idParamSchema, "params"),
  controller.getAthleteTrainingById,
);
router.patch(
  "/athlete/:id",
  validate(idParamSchema, "params"),
  validate(updateAthleteTrainingSchema),
  controller.updateAthleteTraining,
);
router.delete(
  "/athlete/:id",
  validate(idParamSchema, "params"),
  controller.deleteAthleteTraining,
);
router.patch(
  "/athlete/:id/status",
  validate(idParamSchema, "params"),
  validate(updateTrainingStatusSchema),
  controller.updateAthleteTrainingStatus,
);
router.post(
  "/athlete/:id/items",
  validate(idParamSchema, "params"),
  validate(addTrainingItemSchema),
  controller.addTrainingItem,
);
router.patch(
  "/athlete/:id/items/:itemId",
  validate(itemParamSchema, "params"),
  validate(updateTrainingItemSchema),
  controller.updateTrainingItem,
);
router.delete(
  "/athlete/:id/items/:itemId",
  validate(itemParamSchema, "params"),
  controller.deleteTrainingItem,
);
router.patch(
  "/athlete/:id/items/:itemId/status",
  validate(itemParamSchema, "params"),
  validate(updateTrainingItemStatusSchema),
  controller.updateTrainingItemStatus,
);
router.patch(
  "/athlete/:id/items/:itemId/result",
  validate(itemParamSchema, "params"),
  validate(updateTrainingItemResultSchema),
  controller.updateTrainingItemResult,
);

module.exports = router;
