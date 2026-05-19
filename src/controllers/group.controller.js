const asyncHandler = require("../middlewares/asyncHandler");
const service = require("../services/group.service");

const createGroup = asyncHandler(async (req, res) => {
  const group = await service.createGroup(req.body, req.user);
  res.status(201).json({ ok: true, group });
});

const getGroups = asyncHandler(async (req, res) => {
  const groups = await service.getGroups(req.user);
  res.json({ ok: true, groups });
});

const getGroupById = asyncHandler(async (req, res) => {
  const group = await service.getGroupById(req.params.id, req.user);
  res.json({ ok: true, group });
});

const updateGroup = asyncHandler(async (req, res) => {
  const group = await service.updateGroup(req.params.id, req.body, req.user);
  res.json({ ok: true, group });
});

const deleteGroup = asyncHandler(async (req, res) => {
  const group = await service.deleteGroup(req.params.id, req.user);
  res.json({ ok: true, group });
});

const addAthlete = asyncHandler(async (req, res) => {
  const athleteGroup = await service.addAthlete(
    req.params.id,
    req.body.athleteId,
    req.user,
  );
  res.status(201).json({ ok: true, athleteGroup });
});

const removeAthlete = asyncHandler(async (req, res) => {
  const athleteGroup = await service.removeAthlete(
    req.params.id,
    req.params.athleteId,
    req.user,
  );
  res.json({ ok: true, athleteGroup });
});

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addAthlete,
  removeAthlete,
};
