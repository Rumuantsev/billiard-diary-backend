const toCamelUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  coachId: user.coach_id,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
  deletedAt: user.deleted_at,
});

const toCamelGroup = (group, athletes) => ({
  id: group.id,
  name: group.name,
  coachId: group.coach_id,
  description: group.description,
  athletesCount: group.athletes_count,
  ...(athletes ? { athletes } : {}),
  createdAt: group.created_at,
  updatedAt: group.updated_at,
  deletedAt: group.deleted_at,
});

const toCamelFolder = (folder) => ({
  id: folder.id,
  title: folder.title,
  authorId: folder.author_id,
  createdAt: folder.created_at,
  updatedAt: folder.updated_at,
  deletedAt: folder.deleted_at,
});

const toCamelAthleteGroup = (athleteGroup) => ({
  id: athleteGroup.id,
  athleteId: athleteGroup.athlete_id,
  groupId: athleteGroup.group_id,
  createdAt: athleteGroup.created_at,
  deletedAt: athleteGroup.deleted_at,
});

const toCamelExercise = (exercise) => {
  if (!exercise) {
    return null;
  }

  return {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    position: exercise.position,
    authorId: exercise.author_id,
    folderId: exercise.folder_id,
    createdAt: exercise.created_at,
    updatedAt: exercise.updated_at,
    deletedAt: exercise.deleted_at,
  };
};

const toCamelTrainingItem = (item) => ({
  id: item.id,
  athleteTrainingId: item.athlete_training_id,
  exerciseId: item.exercise_id,
  orderIndex: item.order_index,
  targetAttempts: item.target_attempts,
  resultAttempts: item.result_attempts,
  resultSuccesses: item.result_successes,
  status: item.status,
  exercise: toCamelExercise(item.exercise),
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  deletedAt: item.deleted_at,
});

const toCamelAthleteTraining = (training, items) => ({
  id: training.id,
  groupTrainingId: training.group_training_id,
  coachId: training.coach_id,
  athleteId: training.athlete_id,
  athlete: training.athlete ? toCamelUser(training.athlete) : undefined,
  startsAt: training.starts_at,
  endsAt: training.ends_at,
  status: training.status,
  itemsCount: training.items_count,
  ...(items ? { items } : {}),
  createdAt: training.created_at,
  updatedAt: training.updated_at,
  deletedAt: training.deleted_at,
});

const toCamelGroupTraining = (training, athleteTrainings) => ({
  id: training.id,
  coachId: training.coach_id,
  groupId: training.group_id,
  startsAt: training.starts_at,
  endsAt: training.ends_at,
  status: training.status,
  athleteTrainingsCount: training.athlete_trainings_count,
  ...(athleteTrainings ? { athleteTrainings } : {}),
  createdAt: training.created_at,
  updatedAt: training.updated_at,
  deletedAt: training.deleted_at,
});

module.exports = {
  toCamelUser,
  toCamelGroup,
  toCamelFolder,
  toCamelAthleteGroup,
  toCamelExercise,
  toCamelTrainingItem,
  toCamelAthleteTraining,
  toCamelGroupTraining,
};
