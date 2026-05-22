const express = require("express");
const cors = require("cors");
const { CLIENT_URL } = require("./config/env");
const telemetryRoutes = require("./routes/telemetryRoutes");

const app = express();

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use("/api/telemetry", telemetryRoutes);

module.exports = app;
