const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const AppError = require("../utils/appError");

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
  useDefaults: true,
});
addFormats(ajv);

const validate = (schema, source = "body") => {
  const validator = ajv.compile(schema);
  return (req, res, next) => {
    const valid = validator(req[source]);
    if (!valid) {
      return next(
        new AppError(
          400,
          "validation_error",
          "Request validation failed",
          validator.errors,
        ),
      );
    }

    next();
  };
};

module.exports = validate;
