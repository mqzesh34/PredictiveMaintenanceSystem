function getRequiredEnv(name: string) {
  const value = import.meta.env[name];

  if (value === undefined || value === "") {
    throw new Error(`${name} ortam değişkeni tanımlı değil.`);
  }

  return value;
}

function getRequiredNumberEnv(name: string) {
  const value = Number(getRequiredEnv(name));

  if (!Number.isFinite(value)) {
    throw new Error(`${name} geçerli bir sayı değil.`);
  }

  return value;
}

export const env = {
  aiApiBaseUrl: getRequiredEnv("VITE_AI_API_BASE_URL"),
  chartPointLimit: getRequiredNumberEnv("VITE_CHART_POINT_LIMIT"),
  rawChartPointLimit: getRequiredNumberEnv("VITE_RAW_CHART_POINT_LIMIT"),
  telemetryApiBaseUrl: getRequiredEnv("VITE_TELEMETRY_API_BASE_URL"),
  maxFailures: getRequiredNumberEnv("VITE_MAX_FAILURES"),
  maxHistoryLength: getRequiredNumberEnv("VITE_MAX_HISTORY_LENGTH"),
  maxToolWear: getRequiredNumberEnv("VITE_MAX_TOOL_WEAR"),
  socketUrl: getRequiredEnv("VITE_SOCKET_URL"),
  telemetryBucketDurationMs: getRequiredNumberEnv("VITE_BUCKET_DURATION_MS"),
};
