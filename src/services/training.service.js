const AppError = require("../utils/appError");
const exerciseRepository = require("../repositories/exercise.repository");
const groupRepository = require("../repositories/group.repository");
const repository = require("../repositories/training.repository");
const userRepository = require("../repositories/user.repository");
const {
  toCamelAthleteTraining,
  toCamelGroupTraining,
  toCamelTrainingItem,
} = require("../utils/caseMapper");

const TRAINING_STATUS_TRANSITIONS = {
  scheduled: ["in_progress", "cancelled", "missed"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  missed: [],
};

const ATHLETE_TRAINING_STATUS_TRANSITIONS = {
  scheduled: ["in_progress"],
  in_progress: ["completed"],
};

const TRAINING_ITEM_STATUS_TRANSITIONS = {
  not_started: ["in_progress", "skipped"],
  in_progress: ["completed", "skipped"],
  completed: [],
  skipped: [],
};

const normalizeItems = (items = []) =>
  items.map((item, index) => ({
    exerciseId: item.exerciseId,
    orderIndex: item.orderIndex ?? index,
    targetAttempts: item.targetAttempts,
  }));

const normalizeAthleteTrainingsInput = (athleteTrainings = []) =>
  athleteTrainings.map((training) => ({
    athleteId: training.athleteId,
    items: normalizeItems(training.items),
  }));

const flattenAthleteTrainingItems = (athleteTrainings) =>
  athleteTrainings.flatMap((training) => training.items);

const normalizeTrainingQuery = (query = {}) => ({
  date: query.date,
  dateFrom: query.dateFrom,
  dateTo: query.dateTo,
  status: query.status,
  groupId: query.groupId,
  athleteId: query.athleteId,
  limit: query.limit ?? 20,
  offset: query.offset ?? 0,
});

const ensureCoach = (user) => {
  if (user.role !== "coach") {
    throw new AppError(403, "forbidden", "Access denied");
  }
};

const ensureTrainingAccessRole = (user) => {
  if (user.role === "admin") {
    throw new AppError(403, "forbidden", "Admin does not work with trainings");
  }
};

const ensureDateRange = (startsAt, endsAt) => {
  if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
    throw new AppError(
      400,
      "invalid_training_period",
      "startsAt must be earlier than endsAt",
    );
  }
};

const ensureCreateTarget = (data) => {
  const hasGroup = data.groupId !== undefined;
  const hasAthlete = data.athleteId !== undefined;

  if (hasGroup === hasAthlete) {
    throw new AppError(
      400,
      "invalid_training_target",
      "Provide exactly one of groupId or athleteId",
    );
  }
};

const ensureCoachAthlete = async (coachId, athleteId) => {
  const athletes = await userRepository.findCoachAthletesByIds(coachId, [
    athleteId,
  ]);

  if (athletes.length !== 1) {
    throw new AppError(
      403,
      "forbidden_training_athlete",
      "Athlete must belong to current coach",
    );
  }
};

const ensureTrainingExercises = async (coachId, items) => {
  const exerciseIds = [...new Set(items.map((item) => item.exerciseId))];
  const exercises = await exerciseRepository.findActiveExercisesByIds(
    exerciseIds,
    { authorId: coachId },
  );

  if (exercises.length !== exerciseIds.length) {
    throw new AppError(
      400,
      "invalid_training_exercises",
      "Every exercise must exist, be active and belong to current coach",
    );
  }
};

const ensureGroupAthleteItems = (groupAthletes, athleteTrainings) => {
  const groupAthleteIds = new Set(
    groupAthletes.map((athlete) => Number(athlete.id)),
  );
  const seenAthleteIds = new Set();

  athleteTrainings.forEach((training) => {
    const athleteId = Number(training.athleteId);

    if (seenAthleteIds.has(athleteId)) {
      throw new AppError(
        400,
        "duplicate_training_athlete",
        "athleteTrainings cannot contain duplicate athleteId",
      );
    }

    if (!groupAthleteIds.has(athleteId)) {
      throw new AppError(
        400,
        "invalid_group_training_athlete",
        "Every athleteTraining must belong to selected group",
      );
    }

    seenAthleteIds.add(athleteId);
  });
};

const ensureScheduledTraining = (training) => {
  if (training.status !== "scheduled") {
    throw new AppError(
      400,
      "training_is_not_editable",
      "Training can be edited only while scheduled",
    );
  }
};

const ensureTrainingInProgress = (training) => {
  if (training.status !== "in_progress") {
    throw new AppError(
      400,
      "training_is_not_in_progress",
      "Training item execution is available only while training is in progress",
    );
  }
};

const ensureAllowedTransition = (transitions, currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return;
  }

  if (!transitions[currentStatus]?.includes(nextStatus)) {
    throw new AppError(
      400,
      "invalid_status_transition",
      `Cannot change status from ${currentStatus} to ${nextStatus}`,
    );
  }
};

const ensureAthleteStatusPermission = (currentUser, currentStatus, nextStatus) => {
  if (currentUser.role !== "athlete") {
    return;
  }

  ensureAllowedTransition(
    ATHLETE_TRAINING_STATUS_TRANSITIONS,
    currentStatus,
    nextStatus,
  );
};

const getAthleteTrainingScope = (currentUser) => {
  ensureTrainingAccessRole(currentUser);

  return currentUser.role === "coach"
    ? { coachId: currentUser.id }
    : { athleteId: currentUser.id };
};

const groupItemsByAthleteTrainingId = (items) =>
  items.reduce((acc, item) => {
    const key = String(item.athlete_training_id);
    acc[key] ??= [];
    acc[key].push(toCamelTrainingItem(item));
    return acc;
  }, {});

const buildAthleteTrainingDetails = async (athleteTraining) => {
  const hydratedTraining = athleteTraining.athlete
    ? athleteTraining
    : await repository.findAthleteTrainingById(athleteTraining.id);
  const items = await repository.findItemsByAthleteTrainingIds([
    athleteTraining.id,
  ]);

  return toCamelAthleteTraining(
    hydratedTraining ?? athleteTraining,
    items.map(toCamelTrainingItem),
  );
};

const buildTrainingItemDetails = async (athleteTrainingId, itemId) => {
  const items = await repository.findItemsByAthleteTrainingIds([
    athleteTrainingId,
  ]);
  const item = items.find((candidate) => String(candidate.id) === String(itemId));

  if (!item) {
    throw new AppError(404, "not_found", "Training item not found");
  }

  return toCamelTrainingItem(item);
};

const buildGroupTrainingDetails = async (groupTraining) => {
  const athleteTrainings =
    await repository.findAthleteTrainingsByGroupTrainingId(groupTraining.id);
  const items = await repository.findItemsByAthleteTrainingIds(
    athleteTrainings.map((training) => training.id),
  );
  const itemsByAthleteTrainingId = groupItemsByAthleteTrainingId(items);

  return toCamelGroupTraining(
    groupTraining,
    athleteTrainings.map((training) =>
      toCamelAthleteTraining(
        training,
        itemsByAthleteTrainingId[String(training.id)] ?? [],
      ),
    ),
  );
};

const createTraining = async (data, currentUser) => {
  ensureCoach(currentUser);
  ensureCreateTarget(data);
  ensureDateRange(data.startsAt, data.endsAt);

  const items = normalizeItems(data.items);
  const athleteTrainingsInput = normalizeAthleteTrainingsInput(
    data.athleteTrainings,
  );

  if (items.length > 0 && athleteTrainingsInput.length > 0) {
    throw new AppError(
      400,
      "mixed_training_items_input",
      "Use either items or athleteTrainings, not both",
    );
  }

  if (data.athleteId) {
    if (athleteTrainingsInput.length > 0) {
      throw new AppError(
        400,
        "invalid_individual_training_items",
        "athleteTrainings can be used only for group training",
      );
    }

    await ensureTrainingExercises(currentUser.id, items);
    await ensureCoachAthlete(currentUser.id, data.athleteId);

    const athleteTraining = await repository.createIndividualTraining({
      coachId: currentUser.id,
      athleteId: data.athleteId,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      items,
    });

    return {
      type: "athlete",
      athleteTraining: await buildAthleteTrainingDetails(athleteTraining),
    };
  }

  const group = await groupRepository.findGroupById(data.groupId, {
    coachId: currentUser.id,
  });
  if (!group) {
    throw new AppError(404, "not_found", "Group not found");
  }

  const athletes = await groupRepository.findGroupAthletes(data.groupId);
  if (athletes.length === 0) {
    throw new AppError(
      400,
      "empty_training_group",
      "Group must contain at least one athlete",
    );
  }

  ensureGroupAthleteItems(athletes, athleteTrainingsInput);

  const groupItems = flattenAthleteTrainingItems(athleteTrainingsInput);
  await ensureTrainingExercises(
    currentUser.id,
    athleteTrainingsInput.length > 0 ? groupItems : items,
  );

  const itemsByAthleteId =
    athleteTrainingsInput.length > 0
      ? new Map(
          athleteTrainingsInput.map((training) => [
            Number(training.athleteId),
            training.items,
          ]),
        )
      : undefined;

  const groupTraining = await repository.createGroupTraining({
    coachId: currentUser.id,
    groupId: data.groupId,
    athleteIds: athletes.map((athlete) => athlete.id),
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    items,
    itemsByAthleteId,
  });

  return {
    type: "group",
    groupTraining: await buildGroupTrainingDetails(groupTraining),
  };
};

const getTrainings = async (query, currentUser) => {
  ensureTrainingAccessRole(currentUser);

  const filters = normalizeTrainingQuery(query);

  if (
    currentUser.role === "athlete" &&
    filters.athleteId &&
    Number(filters.athleteId) !== Number(currentUser.id)
  ) {
    throw new AppError(403, "forbidden", "Access denied");
  }

  if (currentUser.role === "athlete") {
    const result = await repository.findTrainingsByAthlete(
      currentUser.id,
      filters,
    );

    const mapped = result.trainings.map((training) => ({
      type: "athlete",
      athleteTraining: toCamelAthleteTraining(training),
    }));

    return {
      trainings: mapped,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total,
      },
    };
  }

  const result = await repository.findTrainingsByCoach(
    currentUser.id,
    filters,
  );
  const mapped = result.trainings.map((training) =>
    training.type === "group"
      ? {
          type: "group",
          groupTraining: toCamelGroupTraining(training),
        }
      : {
          type: "athlete",
          athleteTraining: toCamelAthleteTraining(training),
        },
  );

  return {
    trainings: mapped,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total: result.total,
    },
  };
};

const getGroupTrainingById = async (id, currentUser) => {
  ensureCoach(currentUser);

  const groupTraining = await repository.findGroupTrainingById(id, {
    coachId: currentUser.id,
  });
  if (!groupTraining) {
    throw new AppError(404, "not_found", "Group training not found");
  }

  return buildGroupTrainingDetails(groupTraining);
};

const getAthleteTrainingById = async (id, currentUser) => {
  const athleteTraining = await repository.findAthleteTrainingById(
    id,
    getAthleteTrainingScope(currentUser),
  );

  if (!athleteTraining) {
    throw new AppError(404, "not_found", "Athlete training not found");
  }

  return buildAthleteTrainingDetails(athleteTraining);
};

const updateGroupTraining = async (id, data, currentUser) => {
  ensureCoach(currentUser);

  const current = await repository.findGroupTrainingById(id, {
    coachId: currentUser.id,
  });
  if (!current) {
    throw new AppError(404, "not_found", "Group training not found");
  }
  ensureScheduledTraining(current);

  ensureDateRange(data.startsAt ?? current.starts_at, data.endsAt ?? current.ends_at);

  const groupTraining = await repository.updateGroupTraining(id, data, {
    coachId: currentUser.id,
  });

  return buildGroupTrainingDetails(groupTraining);
};

const deleteGroupTraining = async (id, currentUser) => {
  ensureCoach(currentUser);

  const groupTraining = await repository.softDeleteGroupTraining(id, {
    coachId: currentUser.id,
  });
  if (!groupTraining) {
    throw new AppError(404, "not_found", "Group training not found");
  }

  return toCamelGroupTraining(groupTraining);
};

const updateGroupTrainingStatus = async (id, status, currentUser) => {
  ensureCoach(currentUser);

  const current = await repository.findGroupTrainingById(id, {
    coachId: currentUser.id,
  });
  if (!current) {
    throw new AppError(404, "not_found", "Group training not found");
  }

  ensureAllowedTransition(
    TRAINING_STATUS_TRANSITIONS,
    current.status,
    status,
  );

  const groupTraining = await repository.updateGroupTrainingStatus(id, status, {
    coachId: currentUser.id,
  });

  return buildGroupTrainingDetails(groupTraining);
};

const updateAthleteTraining = async (id, data, currentUser) => {
  ensureCoach(currentUser);

  const current = await repository.findAthleteTrainingById(id, {
    coachId: currentUser.id,
  });
  if (!current) {
    throw new AppError(404, "not_found", "Athlete training not found");
  }
  ensureScheduledTraining(current);

  if (data.athleteId !== undefined) {
    if (current.group_training_id) {
      throw new AppError(
        400,
        "group_athlete_training_target_locked",
        "Athlete cannot be changed for group training member",
      );
    }

    await ensureCoachAthlete(currentUser.id, data.athleteId);
  }

  ensureDateRange(data.startsAt ?? current.starts_at, data.endsAt ?? current.ends_at);

  const athleteTraining = await repository.updateAthleteTraining(id, data, {
    coachId: currentUser.id,
  });

  return buildAthleteTrainingDetails(athleteTraining);
};

const deleteAthleteTraining = async (id, currentUser) => {
  ensureCoach(currentUser);

  const athleteTraining = await repository.softDeleteAthleteTraining(id, {
    coachId: currentUser.id,
  });
  if (!athleteTraining) {
    throw new AppError(404, "not_found", "Athlete training not found");
  }

  return toCamelAthleteTraining(athleteTraining);
};

const updateAthleteTrainingStatus = async (id, status, currentUser) => {
  const scope = getAthleteTrainingScope(currentUser);
  const current = await repository.findAthleteTrainingById(id, scope);

  if (!current) {
    throw new AppError(404, "not_found", "Athlete training not found");
  }

  ensureAllowedTransition(
    TRAINING_STATUS_TRANSITIONS,
    current.status,
    status,
  );
  ensureAthleteStatusPermission(currentUser, current.status, status);

  const athleteTraining = await repository.updateAthleteTrainingStatus(
    id,
    status,
    scope,
  );

  return buildAthleteTrainingDetails(athleteTraining);
};

const addTrainingItem = async (athleteTrainingId, data, currentUser) => {
  ensureCoach(currentUser);

  const athleteTraining = await repository.findAthleteTrainingById(
    athleteTrainingId,
    { coachId: currentUser.id },
  );
  if (!athleteTraining) {
    throw new AppError(404, "not_found", "Athlete training not found");
  }
  ensureScheduledTraining(athleteTraining);

  await ensureTrainingExercises(currentUser.id, [data]);

  const item = await repository.createTrainingItem({
    athleteTrainingId,
    exerciseId: data.exerciseId,
    orderIndex: data.orderIndex ?? 0,
    targetAttempts: data.targetAttempts,
  });

  return buildTrainingItemDetails(athleteTrainingId, item.id);
};

const updateTrainingItem = async (
  athleteTrainingId,
  itemId,
  data,
  currentUser,
) => {
  ensureCoach(currentUser);

  const athleteTraining = await repository.findAthleteTrainingById(
    athleteTrainingId,
    { coachId: currentUser.id },
  );
  if (!athleteTraining) {
    throw new AppError(404, "not_found", "Athlete training not found");
  }
  ensureScheduledTraining(athleteTraining);

  const item = await repository.updateTrainingItem(
    athleteTrainingId,
    itemId,
    data,
  );
  if (!item) {
    throw new AppError(404, "not_found", "Training item not found");
  }

  return buildTrainingItemDetails(athleteTrainingId, item.id);
};

const deleteTrainingItem = async (athleteTrainingId, itemId, currentUser) => {
  ensureCoach(currentUser);

  const athleteTraining = await repository.findAthleteTrainingById(
    athleteTrainingId,
    { coachId: currentUser.id },
  );
  if (!athleteTraining) {
    throw new AppError(404, "not_found", "Athlete training not found");
  }
  ensureScheduledTraining(athleteTraining);

  const item = await repository.softDeleteTrainingItem(athleteTrainingId, itemId);
  if (!item) {
    throw new AppError(404, "not_found", "Training item not found");
  }

  return toCamelTrainingItem(item);
};

const updateTrainingItemStatus = async (
  athleteTrainingId,
  itemId,
  status,
  currentUser,
) => {
  const athleteTraining = await repository.findAthleteTrainingById(
    athleteTrainingId,
    getAthleteTrainingScope(currentUser),
  );
  if (!athleteTraining) {
    throw new AppError(404, "not_found", "Athlete training not found");
  }
  ensureTrainingInProgress(athleteTraining);

  const currentItem = await repository.findTrainingItemById(
    athleteTrainingId,
    itemId,
  );
  if (!currentItem) {
    throw new AppError(404, "not_found", "Training item not found");
  }

  ensureAllowedTransition(
    TRAINING_ITEM_STATUS_TRANSITIONS,
    currentItem.status,
    status,
  );

  const item = await repository.updateTrainingItemStatus(
    athleteTrainingId,
    itemId,
    status,
  );

  return buildTrainingItemDetails(athleteTrainingId, item.id);
};

const updateTrainingItemResult = async (
  athleteTrainingId,
  itemId,
  data,
  currentUser,
) => {
  const athleteTraining = await repository.findAthleteTrainingById(
    athleteTrainingId,
    getAthleteTrainingScope(currentUser),
  );
  if (!athleteTraining) {
    throw new AppError(404, "not_found", "Athlete training not found");
  }
  ensureTrainingInProgress(athleteTraining);

  const currentItem = await repository.findTrainingItemById(
    athleteTrainingId,
    itemId,
  );
  if (!currentItem) {
    throw new AppError(404, "not_found", "Training item not found");
  }

  if (currentItem.status !== "in_progress") {
    throw new AppError(
      400,
      "training_item_is_not_in_progress",
      "Result can be updated only while training item is in progress",
    );
  }

  if (data.resultSuccesses > data.resultAttempts) {
    throw new AppError(
      400,
      "invalid_training_item_result",
      "resultSuccesses cannot be greater than resultAttempts",
    );
  }

  const item = await repository.updateTrainingItemResult(
    athleteTrainingId,
    itemId,
    data,
  );

  return buildTrainingItemDetails(athleteTrainingId, item.id);
};

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
