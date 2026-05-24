const express = require("express");
const {
  getAllFailures,
  getLatestFailures,
  getLatestTelemetry,
} = require("../controllers/telemetryController");

const router = express.Router();

router.get("/latest", getLatestTelemetry);
router.get("/failures", getAllFailures);
router.get("/failures/latest", getLatestFailures);

module.exports = router;
