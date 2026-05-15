const asyncHandler = require("../middlewares/asyncHandler");
const service = require("../services/user.service");

const getUsers = asyncHandler(async (req, res) => {
  const users = await service.getUsers(req.query, req.user);
  res.json({ ok: true, users });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await service.getUserById(req.params.id, req.user);
  res.json({ ok: true, user });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await service.updateUser(req.params.id, req.body, req.user);
  res.json({ ok: true, user });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await service.deleteUser(req.params.id, req.user);
  res.json({ ok: true, user });
});

module.exports = {
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
};
