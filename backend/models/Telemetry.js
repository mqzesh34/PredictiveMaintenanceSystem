const mongoose = require("mongoose");

const TelemetrySchema = new mongoose.Schema(
  {
    udi: Number,
    productId: String,
    type: String,
    airTemperature: Number,
    processTemperature: Number,
    rotationalSpeed: Number,
    torque: Number,
    toolWear: Number,
    machineFailure: Number,
    twf: Number,
    hdf: Number,
    pwf: Number,
    osf: Number,
    rnf: Number,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "telemetry_data", strict: false },
);

module.exports = mongoose.model("Telemetry", TelemetrySchema);
