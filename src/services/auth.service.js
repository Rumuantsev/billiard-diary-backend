const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const config = require("../config");
const AppError = require("../utils/appError");
const userRepository = require("../repositories/user.repository");

const normalizeEmail = (email) => email.trim().toLowerCase();

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );

const buildAuthResponse = (user) => ({
  accessToken: signAccessToken(user),
  user,
});

const getRegistrationPlan = async (role, currentUser) => {
  const usersCount = await userRepository.countActiveUsers();

  if (usersCount === 0) {
    if (role !== "admin") {
      throw new AppError(
        403,
        "bootstrap_admin_required",
        "The first user must be an admin",
      );
    }

    return { role: "admin", coachId: null };
  }

  if (!currentUser) {
    throw new AppError(401, "auth_required", "Authentication is required");
  }

  if (currentUser.role === "admin") {
    if (role !== "coach") {
      throw new AppError(
        403,
        "forbidden_role_registration",
        "Admin can register only coaches",
      );
    }

    return { role: "coach", coachId: null };
  }

  if (currentUser.role === "coach") {
    if (role !== "athlete") {
      throw new AppError(
        403,
        "forbidden_role_registration",
        "Coach can register only athletes",
      );
    }

    return { role: "athlete", coachId: currentUser.id };
  }

  throw new AppError(
    403,
    "forbidden_role_registration",
    "Athletes cannot register users",
  );
};

const register = async ({ email, password, name, role }, currentUser) => {
  const registrationPlan = await getRegistrationPlan(role, currentUser);
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await userRepository.createUser({
    email: normalizeEmail(email),
    passwordHash,
    name,
    role: registrationPlan.role,
    coachId: registrationPlan.coachId,
  });

  return buildAuthResponse(user);
};

const login = async ({ email, password }) => {
  const user = await userRepository.findUserByEmailWithPassword(
    normalizeEmail(email),
  );

  if (!user) {
    throw new AppError(401, "invalid_credentials", "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError(401, "invalid_credentials", "Invalid email or password");
  }

  const { password_hash, ...publicUser } = user;
  return buildAuthResponse(publicUser);
};

const getMe = async (currentUser) => currentUser;

module.exports = {
  register,
  login,
  getMe,
};
