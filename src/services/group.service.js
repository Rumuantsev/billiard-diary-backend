const AppError = require("../utils/appError");
const groupRepository = require("../repositories/group.repository");
const userRepository = require("../repositories/user.repository");
const {
  toCamelAthleteGroup,
  toCamelGroup,
  toCamelUser,
} = require("../utils/caseMapper");

const ensureCoach = (user) => {
  if (user.role !== "coach") {
    throw new AppError(403, "forbidden", "Access denied");
  }
};

const ensureGroup = async (id, coachId) => {
  const group = await groupRepository.findGroupById(id, { coachId });

  if (!group) {
    throw new AppError(404, "not_found", "Group not found");
  }

  return group;
};

const ensureCoachAthletes = async (coachId, athleteIds) => {
  const uniqueIds = [...new Set(athleteIds)];
  const athletes = await userRepository.findCoachAthletesByIds(
    coachId,
    uniqueIds,
  );

  if (athletes.length !== uniqueIds.length) {
    throw new AppError(
      400,
      "invalid_group_athletes",
      "Every athlete must exist and belong to current coach",
    );
  }

  return uniqueIds;
};

const buildGroupDetails = async (group) => {
  const athletes = await groupRepository.findGroupAthletes(group.id);

  return toCamelGroup(group, athletes.map(toCamelUser));
};

const createGroup = async (data, currentUser) => {
  ensureCoach(currentUser);

  const athleteIds = await ensureCoachAthletes(
    currentUser.id,
    data.athleteIds ?? [],
  );

  const group = await groupRepository.createGroup({
    name: data.name,
    description: data.description,
    coachId: currentUser.id,
    athleteIds,
  });

  return buildGroupDetails(group);
};

const getGroups = async (currentUser) => {
  ensureCoach(currentUser);

  const groups = await groupRepository.findGroups({ coachId: currentUser.id });

  return groups.map((group) => toCamelGroup(group));
};

const getGroupById = async (id, currentUser) => {
  ensureCoach(currentUser);

  const group = await ensureGroup(id, currentUser.id);

  return buildGroupDetails(group);
};

const updateGroup = async (id, data, currentUser) => {
  ensureCoach(currentUser);

  const group = await groupRepository.updateGroup(id, data, {
    coachId: currentUser.id,
  });

  if (!group) {
    throw new AppError(404, "not_found", "Group not found");
  }

  return buildGroupDetails(group);
};

const deleteGroup = async (id, currentUser) => {
  ensureCoach(currentUser);

  const group = await groupRepository.softDeleteGroup(id, {
    coachId: currentUser.id,
  });

  if (!group) {
    throw new AppError(404, "not_found", "Group not found");
  }

  return toCamelGroup(group);
};

const addAthlete = async (groupId, athleteId, currentUser) => {
  ensureCoach(currentUser);
  await ensureGroup(groupId, currentUser.id);
  await ensureCoachAthletes(currentUser.id, [athleteId]);

  const athleteGroup = await groupRepository.addAthlete({
    groupId,
    athleteId,
  });

  return toCamelAthleteGroup(athleteGroup);
};

const removeAthlete = async (groupId, athleteId, currentUser) => {
  ensureCoach(currentUser);
  await ensureGroup(groupId, currentUser.id);

  const athleteGroup = await groupRepository.removeAthlete({
    groupId,
    athleteId,
  });

  if (!athleteGroup) {
    throw new AppError(404, "not_found", "Athlete group link not found");
  }

  return toCamelAthleteGroup(athleteGroup);
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addAthlete,
  removeAthlete,
};
