module.exports = {
  type: "object",
  required: ["layout", "power"],
  additionalProperties: false,

  properties: {
    power: {
      type: "number",
    },

    layout: {
      type: "object",
      required: ["balls"],
      additionalProperties: false,

      properties: {
        spin: {
          type: "object",
          required: ["x", "y"],
          additionalProperties: false,
          properties: {
            x: { type: "number" },
            y: { type: "number" },
          },
        },

        balls: {
          type: "array",
          items: {
            type: "object",
            required: ["x", "y"],
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
            required: ["from", "to"],
            additionalProperties: false,
            properties: {
              from: {
                type: "object",
                required: ["x", "y"],
                additionalProperties: false,
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                },
              },
              to: {
                type: "object",
                required: ["x", "y"],
                additionalProperties: false,
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                },
              },
              type: { type: "string" },
            },
          },
        },
      },
    },
  },
};
