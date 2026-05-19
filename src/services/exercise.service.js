const AppError = require("../utils/appError");
const folderRepository = require("../repositories/folder.repository");
const repository = require("../repositories/exercise.repository");
const { toCamelExercise } = require("../utils/caseMapper");

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

  if (requestedAuthorId && Number(requestedAuthorId) !== Number(user.id)) {
    throw new AppError(403, "forbidden", "Access denied");
  }

  return user.id;
};

const ensureFolderScope = async (folderId, user) => {
  if (folderId === undefined || folderId === null) {
    return;
  }

  const folder = await folderRepository.findFolderById(folderId, {
    authorId: user.role === "coach" ? user.id : undefined,
  });

  if (!folder) {
    throw new AppError(400, "invalid_exercise_folder", "Folder not found");
  }
};

const createExercise = async (exercise, user) => {
  ensureDirectExerciseAccess(user);
  await ensureFolderScope(exercise.folderId, user);

  const created = await repository.createExercise({
    ...exercise,
    authorId: user.id,
  });

  return toCamelExercise(created);
};

const getExercises = async (query, user) => {
  await ensureFolderScope(query.folderId, user);

  const filters = {
    search: query.search,
    folderId: query.folderId,
    authorId: getAuthorScope(user, query.authorId),
    limit: query.limit,
    offset: query.offset,
  };

  const [exercises, total] = await Promise.all([
    repository.findExercises(filters),
    repository.countExercises(filters),
  ]);

  return {
    exercises: exercises.map(toCamelExercise),
    pagination: {
      limit: query.limit,
      offset: query.offset,
      total,
    },
  };
};

const getExerciseById = async (id, user) => {
  const exercise = await repository.findExerciseById(id, {
    authorId: getAuthorScope(user),
  });
  if (!exercise) {
    throw new AppError(404, "not_found", "Exercise not found");
  }

  return toCamelExercise(exercise);
};

const updateExercise = async (id, exerciseData, user) => {
  await ensureFolderScope(exerciseData.folderId, user);

  const exercise = await repository.updateExercise(id, exerciseData, {
    authorId: getAuthorScope(user),
  });
  if (!exercise) {
    throw new AppError(404, "not_found", "Exercise not found");
  }

  return toCamelExercise(exercise);
};

const deleteExercise = async (id, user) => {
  const exercise = await repository.softDeleteExercise(id, {
    authorId: getAuthorScope(user),
  });
  if (!exercise) {
    throw new AppError(404, "not_found", "Exercise not found");
  }

  return toCamelExercise(exercise);
};

module.exports = {
  createExercise,
  getExercises,
  getExerciseById,
  updateExercise,
  deleteExercise,
};
