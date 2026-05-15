const express = require("express");
const router = express.Router();

const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createFolderSchema,
  idParamSchema,
  updateFolderSchema,
} = require("../schemas/folder.schema");
const controller = require("../controllers/folder.controller");

router.use(authenticate);

router.post("/", validate(createFolderSchema), controller.createFolder);
router.get("/", controller.getFolders);
router.get("/:id", validate(idParamSchema, "params"), controller.getFolderById);
router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateFolderSchema),
  controller.updateFolder,
);
router.delete("/:id", validate(idParamSchema, "params"), controller.deleteFolder);

module.exports = router;
