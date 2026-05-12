const express = require("express");
const router = express.Router();

const {
  authenticate,
  optionalAuthenticate,
} = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { registerSchema, loginSchema } = require("../schemas/auth.schema");
const controller = require("../controllers/auth.controller");

router.post(
  "/register",
  optionalAuthenticate,
  validate(registerSchema),
  controller.register,
);
router.post("/login", validate(loginSchema), controller.login);
router.get("/me", authenticate, controller.getMe);

module.exports = router;
