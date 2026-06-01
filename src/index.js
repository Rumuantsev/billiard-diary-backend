const express = require("express");
const cors = require("cors");

const config = require("./config");
const authRouter = require("./routes/auth.route");
const exercisesRouter = require("./routes/exercise.route");
const foldersRouter = require("./routes/folder.route");
const groupsRouter = require("./routes/group.route");
const heathRouter = require("./routes/heath.route");
const trainingsRouter = require("./routes/training.route");
const usersRouter = require("./routes/user.route");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.use("/auth", authRouter);
app.use("/heath", heathRouter);
app.use("/exercises", exercisesRouter);
app.use("/folders", foldersRouter);
app.use("/groups", groupsRouter);
app.use("/trainings", trainingsRouter);
app.use("/users", usersRouter);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    code: "route_not_found",
    message: "Route not found",
  });
});

app.use(errorHandler);

app.listen(config.port, '0.0.0.0', () =>
  console.log("Backend started on port", config.port),
);
