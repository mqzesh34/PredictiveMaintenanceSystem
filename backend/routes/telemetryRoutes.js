const express = require("express");
const {
  getLatestFailures,
  getLatestTelemetry,
} = require("../controllers/telemetryController");

const router = express.Router();

router.get("/latest", getLatestTelemetry);
router.get("/failures/latest", getLatestFailures);

module.exports = router;
