const Telemetry = require("../models/Telemetry");
const {
  LATEST_FAILURE_LIMIT,
  LATEST_TELEMETRY_LIMIT,
} = require("../config/env");

const getLatestTelemetry = async (_req, res) => {
  try {
    const telemetry = await Telemetry.find({})
      .sort({ timestamp: -1 })
      .limit(LATEST_TELEMETRY_LIMIT)
      .lean();

    res.json(telemetry.reverse());
  } catch (err) {
    console.error("Son telemetry verileri alınamadı:", err.message);
    res.status(500).json({ message: "Telemetry verileri alınamadı." });
  }
};

const getLatestFailures = async (_req, res) => {
  try {
    const failures = await Telemetry.find({ machineFailure: 1 })
      .sort({ timestamp: -1 })
      .limit(LATEST_FAILURE_LIMIT)
      .lean();

    res.json(failures.reverse());
  } catch (err) {
    console.error("Son hata verileri alınamadı:", err.message);
    res.status(500).json({ message: "Hata verileri alınamadı." });
  }
};

module.exports = {
  getLatestTelemetry,
  getLatestFailures,
};
