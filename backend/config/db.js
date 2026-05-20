const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/predictive_maintenance";

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB'ye bağlandı.");
  } catch (err) {
    console.error("MongoDB bağlantı hatası:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
