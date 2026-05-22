import { useEffect, useState } from "react";
import { Astroid } from "lucide-react";
import { io } from "socket.io-client";
import { getLatestFailures } from "../api/telemetryApi";
import { env } from "../config/env";
import type { TelemetryData } from "../types/telemetry";

const FAILURE_FIELDS = [
  ["twf", "TWF", "Takım aşınması riski"],
  ["hdf", "HDF", "Isı dağılımı sorunu"],
  ["pwf", "PWF", "Güç sapması"],
  ["osf", "OSF", "Aşırı yüklenme"],
  ["rnf", "RNF", "Rastgele arıza sinyali"],
] as const;

const timeFormatter = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function FailureLog() {
  const [failures, setFailures] = useState<TelemetryData[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialFailures = async () => {
      try {
        const data = await getLatestFailures();
        if (isMounted) setFailures(data.slice(-env.maxFailures).reverse());
      } catch (err) {
        console.error("Hata verileri alınamadı:", err);
      }
    };

    loadInitialFailures();

    const socket = io(env.socketUrl);

    socket.on("live_data", (newData: TelemetryData) => {
      if (newData.machineFailure !== 1) return;

      setFailures((prev) => [newData, ...prev].slice(0, env.maxFailures));
    });

    return () => {
      isMounted = false;
      socket.off("live_data");
      socket.disconnect();
    };
  }, []);

  const displayedFailures = failures.slice(0, env.maxFailures);

  return (
    <div className="flex h-full flex-col overflow-hidden p-8">
      <h2 className="text-2xl font-bold tracking-tight text-white">
        Canlı Uyarı Akışı
      </h2>

      {displayedFailures.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-zinc-600">Henüz hata kaydı yok</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col justify-evenly gap-3">
          {displayedFailures.map((failure, index) => {
            const failureTime = failure.timestamp
              ? timeFormatter.format(new Date(failure.timestamp))
              : "--:--:--";
            const failureItems = FAILURE_FIELDS.filter(
              ([key]) => failure[key] === 1,
            );
            const joinedCodes = failureItems
              .map(([, code]) => code)
              .join(" - ");
            const joinedMessages = failureItems
              .map(([, , message]) => message)
              .join(", ");
            const failureCodes = joinedCodes === "" ? "MF" : joinedCodes;
            const failureMessage =
              joinedMessages === ""
                ? "Makine arızası algılandı"
                : joinedMessages;
            const keySuffix = failure.udi === undefined ? index : failure.udi;
            const productId =
              failure.productId === undefined ? "--" : failure.productId;

            return (
              <div
                key={`${failure.timestamp}-${failure.productId}-${keySuffix}`}
              >
                <div className="flex items-center gap-5">
                  <span className="shrink-0 text-sm tabular-nums text-zinc-400">
                    {failureTime}
                  </span>

                  <span className="shrink-0 text-sm font-medium text-zinc-300">
                    {productId}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                    {failureMessage}
                  </span>

                  <span className="shrink-0 whitespace-nowrap rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-red-300">
                    {failureCodes}
                  </span>

                  <button
                    type="button"
                    aria-label="Analiz et"
                    title="Analiz et"
                    className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all duration-200 hover:border-white/25 hover:bg-white/10 active:scale-95"
                  >
                    <span className="relative size-6">
                      <Astroid
                        className="absolute inset-0 text-red-400"
                        size={24}
                        strokeWidth={2.6}
                        style={{ clipPath: "polygon(0 0, 100% 0, 50% 50%)" }}
                      />
                      <Astroid
                        className="absolute inset-0 text-blue-400"
                        size={24}
                        strokeWidth={2.6}
                        style={{
                          clipPath: "polygon(100% 0, 100% 100%, 50% 50%)",
                        }}
                      />
                      <Astroid
                        className="absolute inset-0 text-emerald-400"
                        size={24}
                        strokeWidth={2.6}
                        style={{
                          clipPath: "polygon(0 100%, 100% 100%, 50% 50%)",
                        }}
                      />
                      <Astroid
                        className="absolute inset-0 text-yellow-300"
                        size={24}
                        strokeWidth={2.6}
                        style={{ clipPath: "polygon(0 0, 0 100%, 50% 50%)" }}
                      />
                    </span>
                  </button>
                </div>
                {index < displayedFailures.length - 1 && (
                  <hr className="mx-1 mt-3 border-0 border-t border-white/10" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FailureLog;
