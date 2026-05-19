const bcrypt = require("bcryptjs");

const AppError = require("../utils/appError");
const repository = require("../repositories/user.repository");
const groupRepository = require("../repositories/group.repository");
const { toCamelUser } = require("../utils/caseMapper");

const normalizeEmail = (email) => email.trim().toLowerCase();

const getUserOrThrow = async (id) => {
  const user = await repository.findUserById(id);
  if (!user) {
    throw new AppError(404, "not_found", "User not found");
  }

  return user;
};

const ensureCanReadUser = (targetUser, currentUser) => {
  if (currentUser.role === "admin") {
    return;
  }

  if (currentUser.role === "coach") {
    const isSelf = String(targetUser.id) === String(currentUser.id);
    const isOwnAthlete =
      targetUser.role === "athlete" &&
      String(targetUser.coach_id) === String(currentUser.id);

    if (isSelf || isOwnAthlete) {
      return;
    }
  }

  if (
    currentUser.role === "athlete" &&
    String(targetUser.id) === String(currentUser.id)
  ) {
    return;
  }

  throw new AppError(403, "forbidden", "Access denied");
};

const ensureCanWriteUser = (targetUser, currentUser) => {
  if (currentUser.role === "admin") {
    return;
  }

  if (
    currentUser.role === "coach" &&
    targetUser.role === "athlete" &&
    String(targetUser.coach_id) === String(currentUser.id)
  ) {
    return;
  }

  throw new AppError(403, "forbidden", "Access denied");
};

const getUsers = async (query, currentUser) => {
  if (query.groupId && query.role && query.role !== "athlete") {
    throw new AppError(
      400,
      "invalid_user_filter",
      "groupId can be used only with role=athlete",
    );
  }

  if (currentUser.role === "athlete") {
    throw new AppError(403, "forbidden", "Access denied");
  }

  if (query.groupId && currentUser.role === "coach") {
    const group = await groupRepository.findGroupById(query.groupId, {
      coachId: currentUser.id,
    });

    if (!group) {
      throw new AppError(404, "not_found", "Group not found");
    }
  }

  const role = query.groupId ? "athlete" : query.role;
  const users = await repository.findUsers({
    role,
    groupId: query.groupId,
    currentUser,
  });

  return users.map(toCamelUser);
};

const getUserById = async (id, currentUser) => {
  const user = await getUserOrThrow(id);
  ensureCanReadUser(user, currentUser);

  return toCamelUser(user);
};

const updateUser = async (id, data, currentUser) => {
  const current = await getUserOrThrow(id);
  ensureCanWriteUser(current, currentUser);

  const updateData = {};

  if (data.email !== undefined) {
    updateData.email = normalizeEmail(data.email);
  }

  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }

  if (data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const user = await repository.updateUser(id, updateData);

  return toCamelUser(user);
};

const deleteUser = async (id, currentUser) => {
  const current = await getUserOrThrow(id);
  ensureCanWriteUser(current, currentUser);

  if (String(current.id) === String(currentUser.id)) {
    throw new AppError(
      400,
      "cannot_delete_self",
      "Current user cannot delete himself",
    );
  }

  const user = await repository.softDeleteUser(id);

  return toCamelUser(user);
};

module.exports = {
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
};
