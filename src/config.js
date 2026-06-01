require("dotenv").config({ quiet: true });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

module.exports = {
  port: toNumber(process.env.PORT, 3105),
  corsOrigin: process.env.CORS_ORIGIN || "http://kemsu-it.ru:3106",
  jwt: {
    secret:
      process.env.JWT_SECRET || "flash5764-billiard-diary-production-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },
  db: {
    host: process.env.DB_HOST || "82.179.9.27",
    port: toNumber(process.env.DB_PORT, 5432),
    user: process.env.DB_USER || "flash5764",
    password: process.env.DB_PASSWORD || "flash5764pass123",
    database: process.env.DB_NAME || "postgres",
  },
};
