import { env } from "../config/env";
import type { TelemetryData } from "../types/telemetry";

export async function getLatestTelemetry() {
  const response = await fetch(`${env.telemetryApiBaseUrl}/latest`);

  if (!response.ok) {
    throw new Error("Telemetry verileri alınamadı");
  }

  return (await response.json()) as TelemetryData[];
}

export async function getLatestFailures() {
  const response = await fetch(`${env.telemetryApiBaseUrl}/failures/latest`);

  if (!response.ok) {
    throw new Error("Hata verileri alınamadı");
  }

  return (await response.json()) as TelemetryData[];
}

export async function getAllFailures() {
  const response = await fetch(`${env.telemetryApiBaseUrl}/failures`);

  if (!response.ok) {
    throw new Error("Hata verileri alınamadı");
  }

  return (await response.json()) as TelemetryData[];
}
