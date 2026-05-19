const userQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    role: { type: "string", enum: ["admin", "coach", "athlete"] },
    groupId: { type: "integer", minimum: 1 },
  },
};

const idParamSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
  },
};

const updateUserSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email", minLength: 3, maxLength: 255 },
    name: { type: "string", minLength: 2, maxLength: 255 },
    password: { type: "string", minLength: 3, maxLength: 128 },
  },
};

module.exports = {
  idParamSchema,
  updateUserSchema,
  userQuerySchema,
};
