const trainingItemInputSchema = {
  type: "object",
  required: ["exerciseId"],
  additionalProperties: false,
  properties: {
    exerciseId: { type: "integer", minimum: 1 },
    orderIndex: { type: "integer", minimum: 0 },
    targetAttempts: { type: "integer", minimum: 1 },
  },
};

const createTrainingSchema = {
  type: "object",
  required: ["startsAt", "endsAt"],
  additionalProperties: false,
  properties: {
    groupId: { type: "integer", minimum: 1 },
    athleteId: { type: "integer", minimum: 1 },
    startsAt: { type: "string", format: "date-time" },
    endsAt: { type: "string", format: "date-time" },
    items: {
      type: "array",
      default: [],
      items: trainingItemInputSchema,
    },
    athleteTrainings: {
      type: "array",
      items: {
        type: "object",
        required: ["athleteId"],
        additionalProperties: false,
        properties: {
          athleteId: { type: "integer", minimum: 1 },
          items: {
            type: "array",
            default: [],
            items: trainingItemInputSchema,
          },
        },
      },
    },
  },
};

const trainingQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    date: { type: "string", minLength: 10, maxLength: 10 },
    dateFrom: { type: "string", minLength: 10, maxLength: 35 },
    dateTo: { type: "string", minLength: 10, maxLength: 35 },
    status: {
      type: "string",
      enum: ["scheduled", "in_progress", "completed", "cancelled", "missed"],
    },
    groupId: { type: "integer", minimum: 1 },
    athleteId: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    offset: { type: "integer", minimum: 0, default: 0 },
  },
};

const updateGroupTrainingSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    startsAt: { type: "string", format: "date-time" },
    endsAt: { type: "string", format: "date-time" },
  },
};

const updateAthleteTrainingSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    athleteId: { type: "integer", minimum: 1 },
    startsAt: { type: "string", format: "date-time" },
    endsAt: { type: "string", format: "date-time" },
  },
};

const updateTrainingStatusSchema = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["scheduled", "in_progress", "completed", "cancelled", "missed"],
    },
  },
};

const addTrainingItemSchema = {
  type: "object",
  required: ["exerciseId"],
  additionalProperties: false,
  properties: trainingItemInputSchema.properties,
};

const updateTrainingItemSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    orderIndex: { type: "integer", minimum: 0 },
    targetAttempts: { type: ["integer", "null"], minimum: 1 },
  },
};

const updateTrainingItemStatusSchema = {
  type: "object",
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["not_started", "in_progress", "completed", "skipped"],
    },
  },
};

const updateTrainingItemResultSchema = {
  type: "object",
  required: ["resultAttempts", "resultSuccesses"],
  additionalProperties: false,
  properties: {
    resultAttempts: { type: "integer", minimum: 0 },
    resultSuccesses: { type: "integer", minimum: 0 },
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

const itemParamSchema = {
  type: "object",
  required: ["id", "itemId"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    itemId: { type: "integer", minimum: 1 },
  },
};

module.exports = {
  createTrainingSchema,
  trainingQuerySchema,
  updateGroupTrainingSchema,
  updateAthleteTrainingSchema,
  updateTrainingStatusSchema,
  addTrainingItemSchema,
  updateTrainingItemSchema,
  updateTrainingItemStatusSchema,
  updateTrainingItemResultSchema,
  idParamSchema,
  itemParamSchema,
};
