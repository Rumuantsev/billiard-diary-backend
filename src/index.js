const express = require("express");
const cors = require("cors");

const positionsRouter = require("./routes/positions.route");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/positions", positionsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Backend started on port", PORT);
});
