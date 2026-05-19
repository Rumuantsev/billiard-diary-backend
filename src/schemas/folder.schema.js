const folderFields = {
  title: { type: "string", minLength: 2, maxLength: 255 },
};

const createFolderSchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: folderFields,
};

const updateFolderSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: folderFields,
};

const idParamSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
  },
};

module.exports = {
  createFolderSchema,
  idParamSchema,
  updateFolderSchema,
};
