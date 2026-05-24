function getRequiredEnv(name) {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(`${name} ortam değişkeni tanımlı değil.`);
  }

  return value;
}

function getRequiredNumberEnv(name) {
  const value = Number(getRequiredEnv(name));

  if (!Number.isFinite(value)) {
    throw new Error(`${name} geçerli bir sayı değil.`);
  }

  return value;
}

module.exports = {
  BACKEND_PORT: getRequiredNumberEnv("BACKEND_PORT"),
  CLIENT_URL: getRequiredEnv("CLIENT_URL"),
  GEMINI_API_KEY: getRequiredEnv("GEMINI_API_KEY"),
  GEMINI_MODEL: getRequiredEnv("GEMINI_MODEL"),
  LATEST_FAILURE_LIMIT: getRequiredNumberEnv("LATEST_FAILURE_LIMIT"),
  LATEST_TELEMETRY_LIMIT: getRequiredNumberEnv("LATEST_TELEMETRY_LIMIT"),
  MONGO_URI: getRequiredEnv("MONGO_URI"),
  MQTT_HOST: getRequiredEnv("MQTT_HOST"),
  MQTT_PORT: getRequiredNumberEnv("MQTT_PORT"),
  MQTT_TOPIC: getRequiredEnv("MQTT_TOPIC"),
};
