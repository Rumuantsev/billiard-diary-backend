const AppError = require("../utils/appError");
const repository = require("../repositories/folder.repository");
const { toCamelFolder } = require("../utils/caseMapper");

const ensureFolderAccess = (user) => {
  if (user.role === "athlete") {
    throw new AppError(
      403,
      "direct_folder_access_forbidden",
      "Athletes cannot access folders directly",
    );
  }
};

const getAuthorScope = (user) => {
  ensureFolderAccess(user);
  return user.role === "coach" ? user.id : undefined;
};

const createFolder = async (data, user) => {
  ensureFolderAccess(user);

  const folder = await repository.createFolder({
    title: data.title.trim(),
    authorId: user.id,
  });

  return toCamelFolder(folder);
};

const getFolders = async (user) => {
  const folders = await repository.findFolders({
    authorId: getAuthorScope(user),
  });

  return folders.map(toCamelFolder);
};

const getFolderById = async (id, user) => {
  const folder = await repository.findFolderById(id, {
    authorId: getAuthorScope(user),
  });

  if (!folder) {
    throw new AppError(404, "not_found", "Folder not found");
  }

  return toCamelFolder(folder);
};

const updateFolder = async (id, data, user) => {
  ensureFolderAccess(user);

  const folder = await repository.updateFolder(
    id,
    { title: data.title?.trim() },
    { authorId: getAuthorScope(user) },
  );

  if (!folder) {
    throw new AppError(404, "not_found", "Folder not found");
  }

  return toCamelFolder(folder);
};

const deleteFolder = async (id, user) => {
  ensureFolderAccess(user);

  const folder = await repository.softDeleteFolder(id, {
    authorId: getAuthorScope(user),
  });

  if (!folder) {
    throw new AppError(404, "not_found", "Folder not found");
  }

  return toCamelFolder(folder);
};

module.exports = {
  createFolder,
  deleteFolder,
  getFolderById,
  getFolders,
  updateFolder,
};
