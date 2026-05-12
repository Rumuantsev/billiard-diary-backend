const express = require("express");
const cors = require("cors");

const config = require("./config");
const authRouter = require("./routes/auth.route");
const exercisesRouter = require("./routes/exercise.route");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.use("/auth", authRouter);
app.use("/exercises", exercisesRouter);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    code: "route_not_found",
    message: "Route not found",
  });
});

app.use(errorHandler);

app.listen(config.port, () =>
  console.log("Backend started on port", config.port),
);
