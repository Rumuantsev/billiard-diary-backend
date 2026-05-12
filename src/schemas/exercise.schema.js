const pointSchema = {
  type: "object",
  required: ["x", "y"],
  additionalProperties: false,
  properties: {
    x: { type: "number" },
    y: { type: "number" },
  },
};

const positionSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    balls: {
      type: "array",
      items: {
        type: "object",
        required: ["x", "y", "type"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1, maxLength: 100 },
          x: { type: "number" },
          y: { type: "number" },
          type: { type: "string", minLength: 1, maxLength: 50 },
        },
      },
    },
    lines: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "type"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1, maxLength: 100 },
          from: pointSchema,
          to: pointSchema,
          type: { type: "string", minLength: 1, maxLength: 50 },
        },
      },
    },
    spin: pointSchema,
    power: { type: "number" },
  },
};

const exerciseFields = {
  title: { type: "string", minLength: 3, maxLength: 255 },
  description: { type: ["string", "null"], maxLength: 3000 },
  position: positionSchema,
  folderId: { type: ["integer", "null"], minimum: 1 },
};

const createExerciseSchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: exerciseFields,
};

const updateExerciseSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: exerciseFields,
};

const exerciseQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", minLength: 1, maxLength: 255 },
    folderId: { type: "integer", minimum: 1 },
    authorId: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    offset: { type: "integer", minimum: 0, default: 0 },
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

module.exports = {
  createExerciseSchema,
  updateExerciseSchema,
  exerciseQuerySchema,
  idParamSchema,
};
