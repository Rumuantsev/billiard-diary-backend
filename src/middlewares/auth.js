const jwt = require("jsonwebtoken");

const config = require("../config");
const AppError = require("../utils/appError");
const userRepository = require("../repositories/user.repository");

const getBearerToken = (req) => {
  const header = req.get("Authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError(
      401,
      "invalid_auth_header",
      "Authorization header must use Bearer token",
    );
  }

  return token;
};

const resolveUserFromToken = async (token) => {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await userRepository.findUserById(payload.sub);

    if (!user) {
      throw new AppError(401, "invalid_token", "Invalid access token");
    }

    return user;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError(401, "invalid_token", "Invalid access token");
  }
};

const authenticate = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      throw new AppError(401, "auth_required", "Authentication is required");
    }

    req.user = await resolveUserFromToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (token) {
      req.user = await resolveUserFromToken(token);
    }

    next();
  } catch (err) {
    next(err);
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError(401, "auth_required", "Authentication is required"),
    );
  }

  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, "forbidden", "Access denied"));
  }

  return next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorizeRoles,
};
