const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  idParamSchema,
  updateUserSchema,
  userQuerySchema,
} = require("../schemas/user.schema");
const controller = require("../controllers/user.controller");

router.use(authenticate);

router.get("/", validate(userQuerySchema, "query"), controller.getUsers);
router.get("/:id", validate(idParamSchema, "params"), controller.getUserById);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateUserSchema),
  controller.updateUser,
);
router.delete("/:id", validate(idParamSchema, "params"), controller.deleteUser);

module.exports = router;
