const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  addAthleteSchema,
  athleteParamSchema,
  createGroupSchema,
  idParamSchema,
  updateGroupSchema,
} = require("../schemas/group.schema");
const controller = require("../controllers/group.controller");

router.use(authenticate);

router.post("/", validate(createGroupSchema), controller.createGroup);
router.get("/", controller.getGroups);
router.get("/:id", validate(idParamSchema, "params"), controller.getGroupById);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateGroupSchema),
  controller.updateGroup,
);
router.delete("/:id", validate(idParamSchema, "params"), controller.deleteGroup);
router.post(
  "/:id/athletes",
  validate(idParamSchema, "params"),
  validate(addAthleteSchema),
  controller.addAthlete,
);
router.delete(
  "/:id/athletes/:athleteId",
  validate(athleteParamSchema, "params"),
  controller.removeAthlete,
);

module.exports = router;
