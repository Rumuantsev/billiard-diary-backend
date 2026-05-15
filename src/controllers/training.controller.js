const asyncHandler = require("../middlewares/asyncHandler");
const service = require("../services/training.service");

const createTraining = asyncHandler(async (req, res) => {
  const training = await service.createTraining(req.body, req.user);
  res.status(201).json({ ok: true, training });
});

const getTrainings = asyncHandler(async (req, res) => {
  const result = await service.getTrainings(req.query, req.user);
  res.json({ ok: true, ...result });
});

const getGroupTrainingById = asyncHandler(async (req, res) => {
  const groupTraining = await service.getGroupTrainingById(
    req.params.id,
    req.user,
  );
  res.json({ ok: true, groupTraining });
});

const getAthleteTrainingById = asyncHandler(async (req, res) => {
  const athleteTraining = await service.getAthleteTrainingById(
    req.params.id,
    req.user,
  );
  res.json({ ok: true, athleteTraining });
});

const updateGroupTraining = asyncHandler(async (req, res) => {
  const groupTraining = await service.updateGroupTraining(
    req.params.id,
    req.body,
    req.user,
  );
  res.json({ ok: true, groupTraining });
});

const deleteGroupTraining = asyncHandler(async (req, res) => {
  const groupTraining = await service.deleteGroupTraining(
    req.params.id,
    req.user,
  );
  res.json({ ok: true, groupTraining });
});

const updateGroupTrainingStatus = asyncHandler(async (req, res) => {
  const groupTraining = await service.updateGroupTrainingStatus(
    req.params.id,
    req.body.status,
    req.user,
  );
  res.json({ ok: true, groupTraining });
});

const updateAthleteTraining = asyncHandler(async (req, res) => {
  const athleteTraining = await service.updateAthleteTraining(
    req.params.id,
    req.body,
    req.user,
  );
  res.json({ ok: true, athleteTraining });
});

const deleteAthleteTraining = asyncHandler(async (req, res) => {
  const athleteTraining = await service.deleteAthleteTraining(
    req.params.id,
    req.user,
  );
  res.json({ ok: true, athleteTraining });
});

const updateAthleteTrainingStatus = asyncHandler(async (req, res) => {
  const athleteTraining = await service.updateAthleteTrainingStatus(
    req.params.id,
    req.body.status,
    req.user,
  );
  res.json({ ok: true, athleteTraining });
});

const addTrainingItem = asyncHandler(async (req, res) => {
  const item = await service.addTrainingItem(req.params.id, req.body, req.user);
  res.status(201).json({ ok: true, item });
});

const updateTrainingItem = asyncHandler(async (req, res) => {
  const item = await service.updateTrainingItem(
    req.params.id,
    req.params.itemId,
    req.body,
    req.user,
  );
  res.json({ ok: true, item });
});

const deleteTrainingItem = asyncHandler(async (req, res) => {
  const item = await service.deleteTrainingItem(
    req.params.id,
    req.params.itemId,
    req.user,
  );
  res.json({ ok: true, item });
});

const updateTrainingItemStatus = asyncHandler(async (req, res) => {
  const item = await service.updateTrainingItemStatus(
    req.params.id,
    req.params.itemId,
    req.body.status,
    req.user,
  );
  res.json({ ok: true, item });
});

const updateTrainingItemResult = asyncHandler(async (req, res) => {
  const item = await service.updateTrainingItemResult(
    req.params.id,
    req.params.itemId,
    req.body,
    req.user,
  );
  res.json({ ok: true, item });
});

module.exports = {
  createTraining,
  getTrainings,
  getGroupTrainingById,
  getAthleteTrainingById,
  updateGroupTraining,
  deleteGroupTraining,
  updateGroupTrainingStatus,
  updateAthleteTraining,
  deleteAthleteTraining,
  updateAthleteTrainingStatus,
  addTrainingItem,
  updateTrainingItem,
  deleteTrainingItem,
  updateTrainingItemStatus,
  updateTrainingItemResult,
};
