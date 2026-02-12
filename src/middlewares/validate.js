const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: true,
});

addFormats(ajv);

const validate = (schema) => {
  const validator = ajv.compile(schema);

  return (req, res, next) => {
    const valid = validator(req.body);

    if (!valid) {
      return res.status(400).json({
        ok: false,
        errors: validator.errors,
      });
    }

    next();
  };
};

module.exports = validate;
