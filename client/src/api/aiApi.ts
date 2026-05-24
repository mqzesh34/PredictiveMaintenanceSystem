import { env } from "../config/env";
import type { TelemetryData } from "../types/telemetry";

export async function createAiRecommendation({
  telemetry,
}: {
  telemetry: TelemetryData;
}) {
  const response = await fetch(`${env.aiApiBaseUrl}/recommendation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      telemetry,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Yapay zeka önerisi alınamadı");
  }

  return data.recommendation as string;
}
