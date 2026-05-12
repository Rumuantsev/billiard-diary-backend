const AppError = require("../utils/appError");

const postgresErrorMap = {
  "23503": {
    statusCode: 400,
    code: "foreign_key_violation",
    message: "Referenced entity does not exist",
  },
  "23505": {
    statusCode: 409,
    code: "unique_violation",
    message: "Entity already exists",
  },
  "23514": {
    statusCode: 400,
    code: "check_violation",
    message: "Entity violates database constraints",
  },
};

const normalizeError = (err) => {
  if (err instanceof AppError) {
    return err;
  }

  if (err.code && postgresErrorMap[err.code]) {
    const mapped = postgresErrorMap[err.code];
    return new AppError(
      mapped.statusCode,
      mapped.code,
      mapped.message,
      err.detail,
    );
  }

  return new AppError(500, "internal_error", "Internal server error");
};

const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);

  if (error.statusCode >= 500) {
    console.error(err);
  }

  res.status(error.statusCode).json({
    ok: false,
    code: error.code,
    message: error.message,
    details: error.details,
  });
};

module.exports = errorHandler;
