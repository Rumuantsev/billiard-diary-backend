const asyncHandler = require("../middlewares/asyncHandler");
const service = require("../services/auth.service");

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body, req.user);
  res.status(201).json({ ok: true, ...result });
});

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  res.json({ ok: true, ...result });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await service.getMe(req.user);
  res.json({ ok: true, user });
});

module.exports = {
  register,
  login,
  getMe,
};
