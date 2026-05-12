const emailSchema = {
  type: "string",
  format: "email",
  minLength: 3,
  maxLength: 255,
};

const passwordSchema = {
  type: "string",
  minLength: 3,
  maxLength: 128,
};

const registerSchema = {
  type: "object",
  required: ["email", "password", "name", "role"],
  additionalProperties: false,
  properties: {
    email: emailSchema,
    password: passwordSchema,
    name: { type: "string", minLength: 2, maxLength: 255 },
    role: { type: "string", enum: ["admin", "coach", "athlete"] },
  },
};

const loginSchema = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: emailSchema,
    password: passwordSchema,
  },
};

module.exports = {
  registerSchema,
  loginSchema,
};
