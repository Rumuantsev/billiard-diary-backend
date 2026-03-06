module.exports = {
  type: "object",
  required: ["title"],
  additionalProperties: false,

  properties: {
    title: { type: "string" },
    description: { type: "string" },

    position: {
      type: "object",
      additionalProperties: false,
      properties: {
        balls: {
          type: "array",
          items: {
            type: "object",
            required: ["x", "y", "type"],
            additionalProperties: false,
            properties: {
              x: { type: "number" },
              y: { type: "number" },
              type: { type: "string" },
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
              from: {
                type: "object",
                required: ["x", "y"],
                additionalProperties: false,
                properties: { x: { type: "number" }, y: { type: "number" } },
              },
              to: {
                type: "object",
                required: ["x", "y"],
                additionalProperties: false,
                properties: { x: { type: "number" }, y: { type: "number" } },
              },
              type: { type: "string" },
            },
          },
        },
        spin: {
          type: "object",
          required: ["x", "y"],
          additionalProperties: false,
          properties: { x: { type: "number" }, y: { type: "number" } },
        },
        power: { type: "number" },
      },
    },
  },
};
