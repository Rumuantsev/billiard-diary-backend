const express = require("express");
const cors = require("cors");

const exercisesRouter = require("./routes/exercise.route");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/exercises", exercisesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Backend started on port", PORT));
