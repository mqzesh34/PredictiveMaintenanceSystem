import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getLatestTelemetry } from "../api/telemetryApi";
import { env } from "../config/env";
import type { TelemetryData } from "../types/telemetry";

export function useLiveTelemetry() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const socket = io(env.socketUrl);

    const loadLatestTelemetry = async () => {
      try {
        const latestTelemetry = await getLatestTelemetry();

        if (!isMounted) return;

        const limitedHistory = latestTelemetry.slice(-env.maxHistoryLength);

        setHistory(limitedHistory);
        const latestData = limitedHistory.at(-1);
        setData(latestData === undefined ? null : latestData);
      } catch (err) {
        console.error("Son telemetry verileri alınamadı:", err);
      }
    };

    loadLatestTelemetry();

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", () => {
      setIsConnected(false);
    });

    socket.on("live_data", (newData: TelemetryData) => {
      setData(newData);
      setHistory((currentHistory) =>
        [...currentHistory, newData].slice(-env.maxHistoryLength),
      );
    });

    return () => {
      isMounted = false;
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("live_data");
      socket.disconnect();
    };
  }, []);

  return { data, history, isConnected };
}
