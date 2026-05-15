const asyncHandler = require("../middlewares/asyncHandler");
const service = require("../services/folder.service");

const createFolder = asyncHandler(async (req, res) => {
  const folder = await service.createFolder(req.body, req.user);
  res.status(201).json({ ok: true, folder });
});

const getFolders = asyncHandler(async (req, res) => {
  const folders = await service.getFolders(req.user);
  res.json({ ok: true, folders });
});

const getFolderById = asyncHandler(async (req, res) => {
  const folder = await service.getFolderById(req.params.id, req.user);
  res.json({ ok: true, folder });
});

const updateFolder = asyncHandler(async (req, res) => {
  const folder = await service.updateFolder(req.params.id, req.body, req.user);
  res.json({ ok: true, folder });
});

const deleteFolder = asyncHandler(async (req, res) => {
  const folder = await service.deleteFolder(req.params.id, req.user);
  res.json({ ok: true, folder });
});

module.exports = {
  createFolder,
  deleteFolder,
  getFolderById,
  getFolders,
  updateFolder,
};
