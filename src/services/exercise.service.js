const AppError = require("../utils/appError");
const repository = require("../repositories/exercise.repository");

const ensureDirectExerciseAccess = (user) => {
  if (user.role === "athlete") {
    throw new AppError(
      403,
      "direct_exercise_access_forbidden",
      "Athletes cannot access exercises directly",
    );
  }
};

const getAuthorScope = (user, requestedAuthorId) => {
  ensureDirectExerciseAccess(user);

  if (user.role === "admin") {
    return requestedAuthorId;
  }

  if (requestedAuthorId && requestedAuthorId !== user.id) {
    throw new AppError(403, "forbidden", "Access denied");
  }

  return user.id;
};

const createExercise = (exercise, user) => {
  ensureDirectExerciseAccess(user);

  return repository.createExercise({
    ...exercise,
    authorId: user.id,
  });
};

const getExercises = (query, user) =>
  repository.findExercises({
    search: query.search,
    folderId: query.folderId,
    authorId: getAuthorScope(user, query.authorId),
    limit: query.limit,
    offset: query.offset,
  });

const getExerciseById = async (id, user) => {
  const exercise = await repository.findExerciseById(id, {
    authorId: getAuthorScope(user),
  });
  if (!exercise) {
    throw new AppError(404, "not_found", "Exercise not found");
  }

  return exercise;
};

const updateExercise = async (id, exerciseData, user) => {
  const exercise = await repository.updateExercise(id, exerciseData, {
    authorId: getAuthorScope(user),
  });
  if (!exercise) {
    throw new AppError(404, "not_found", "Exercise not found");
  }

  return exercise;
};

const deleteExercise = async (id, user) => {
  const exercise = await repository.softDeleteExercise(id, {
    authorId: getAuthorScope(user),
  });
  if (!exercise) {
    throw new AppError(404, "not_found", "Exercise not found");
  }

  return exercise;
};

module.exports = {
  createExercise,
  getExercises,
  getExerciseById,
  updateExercise,
  deleteExercise,
};
