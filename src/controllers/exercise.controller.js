const asyncHandler = require("../middlewares/asyncHandler");
const service = require("../services/exercise.service");

const createExercise = asyncHandler(async (req, res) => {
  const exercise = await service.createExercise(req.body, req.user);
  res.status(201).json({ ok: true, exercise });
});

const getExercises = asyncHandler(async (req, res) => {
  const exercises = await service.getExercises(req.query, req.user);
  res.json({
    ok: true,
    exercises,
    pagination: {
      limit: req.query.limit,
      offset: req.query.offset,
    },
  });
});

const getExerciseById = asyncHandler(async (req, res) => {
  const exercise = await service.getExerciseById(req.params.id, req.user);
  res.json({ ok: true, exercise });
});

const updateExercise = asyncHandler(async (req, res) => {
  const exercise = await service.updateExercise(
    req.params.id,
    req.body,
    req.user,
  );
  res.json({ ok: true, exercise });
});

const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await service.deleteExercise(req.params.id, req.user);
  res.status(200).json({ ok: true, exercise });
});

module.exports = {
  createExercise,
  getExercises,
  getExerciseById,
  updateExercise,
  deleteExercise,
};
