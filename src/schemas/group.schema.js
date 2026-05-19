const groupFields = {
  name: { type: "string", minLength: 2, maxLength: 255 },
  description: { type: ["string", "null"], maxLength: 3000 },
};

const createGroupSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    ...groupFields,
    athleteIds: {
      type: "array",
      default: [],
      uniqueItems: true,
      items: { type: "integer", minimum: 1 },
    },
  },
};

const updateGroupSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: groupFields,
};

const idParamSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
  },
};

const athleteParamSchema = {
  type: "object",
  required: ["id", "athleteId"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    athleteId: { type: "integer", minimum: 1 },
  },
};

const addAthleteSchema = {
  type: "object",
  required: ["athleteId"],
  additionalProperties: false,
  properties: {
    athleteId: { type: "integer", minimum: 1 },
  },
};

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  idParamSchema,
  athleteParamSchema,
  addAthleteSchema,
};
