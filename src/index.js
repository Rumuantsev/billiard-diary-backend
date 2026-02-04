const express = require("express");
const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => {
  console.log("Backend started on port 3000");
});

const pool = require("./db");

pool
  .query("select 1")
  .then(() => console.log("DB connected"))
  .catch((err) => console.error(err));
