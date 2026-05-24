import { useCallback, useEffect, useRef, useState } from "react";
import { Astroid, X } from "lucide-react";
import { io } from "socket.io-client";
import { getAllFailures, getLatestFailures } from "../api/telemetryApi";
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

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const toDateInputValue = (timestamp?: string) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const MACHINE_TYPES = [
  {
    label: "High",
    selectedClass: "border-red-300/50 bg-red-500/15 text-red-400",
    type: "H",
  },
  {
    label: "Medium",
    selectedClass: "border-yellow-300/50 bg-yellow-500/15 text-yellow-300",
    type: "M",
  },
  {
    label: "Low",
    selectedClass: "border-emerald-300/50 bg-emerald-500/15 text-emerald-400",
    type: "L",
  },
] as const;

export type FailureField = (typeof FAILURE_FIELDS)[number][0];
export type MachineType = (typeof MACHINE_TYPES)[number]["type"];

type FailureFilterBarProps = {
  selectedFailureFields: FailureField[];
  selectedDate: string;
  selectedTypes: MachineType[];
  onDateChange: (date: string) => void;
  onToggleFailureField: (field: FailureField) => void;
  onToggleType: (type: MachineType) => void;
  onClear: () => void;
};

type FailureLogProps = {
  onAnalyze: (failure: TelemetryData) => void;
  isHistoryPage?: boolean;
  selectedDate?: string;
  selectedFailureFields?: FailureField[];
  selectedTypes?: MachineType[];
};

export function FailureFilterBar({
  selectedFailureFields,
  selectedDate,
  selectedTypes,
  onDateChange,
  onToggleFailureField,
  onToggleType,
  onClear,
}: FailureFilterBarProps) {
  const hasActiveFilters =
    selectedFailureFields.length > 0 ||
    selectedTypes.length > 0 ||
    selectedDate !== "";

  return (
    <div className="flex h-full min-h-0 flex-wrap items-center gap-3 p-6">
      <div className="flex flex-wrap items-center gap-2">
        {FAILURE_FIELDS.map(([field, code]) => {
          const isSelected = selectedFailureFields.includes(field);

          return (
            <label
              key={field}
              className={`flex h-10 cursor-pointer items-center rounded-full border-2 px-4 text-xs font-semibold tracking-wide transition-colors ${
                isSelected
                  ? "border-red-300/50 bg-red-500/15 text-red-200"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/8"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleFailureField(field)}
                className="sr-only"
              />
              <span>{code}</span>
            </label>
          );
        })}
      </div>

      <div className="h-6 w-px bg-white/10" />

      <input
        type="date"
        value={selectedDate}
        onChange={(event) => onDateChange(event.target.value)}
        className="h-10 cursor-pointer rounded-full border-2 border-white/10 bg-white/5 px-4 text-xs font-semibold text-zinc-300 scheme-dark transition-colors hover:border-white/20 hover:bg-white/8"
      />

      <div className="h-6 w-px bg-white/10" />

      <div className="flex flex-wrap items-center gap-2">
        {MACHINE_TYPES.map(({ label, selectedClass, type }) => {
          const isSelected = selectedTypes.includes(type);

          return (
            <label
              key={type}
              className={`flex h-10 cursor-pointer items-center rounded-full border-2 px-4 text-xs font-semibold tracking-wide transition-colors ${
                isSelected
                  ? selectedClass
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/8"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleType(type)}
                className="sr-only"
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={!hasActiveFilters}
        className="ml-auto flex h-10 cursor-pointer items-center gap-2 rounded-full border-2 border-white/10 bg-white/5 px-4 text-xs font-semibold text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <X size={14} />
        <span>Temizle</span>
      </button>
    </div>
  );
}

function FailureLog({
  onAnalyze,
  isHistoryPage = false,
  selectedDate = "",
  selectedFailureFields = [],
  selectedTypes = [],
}: FailureLogProps) {
  const [failures, setFailures] = useState<TelemetryData[]>([]);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const updateScrollHint = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container === null) return;

    const canScroll = container.scrollHeight > container.clientHeight + 1;
    const isAtBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - 4;

    setShowScrollHint(canScroll && !isAtBottom);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialFailures = async () => {
      try {
        const data = isHistoryPage
          ? await getAllFailures()
          : await getLatestFailures();

        if (isMounted) {
          setFailures(
            isHistoryPage
              ? [...data].reverse()
              : data.slice(-env.maxFailures).reverse(),
          );
        }
      } catch (err) {
        console.error("Hata verileri alınamadı:", err);
      }
    };

    loadInitialFailures();

    const socket = io(env.socketUrl);

    socket.on("live_data", (newData: TelemetryData) => {
      if (newData.machineFailure !== 1) return;

      setFailures((prev) => {
        const nextFailures = [newData, ...prev];

        return isHistoryPage
          ? nextFailures
          : nextFailures.slice(0, env.maxFailures);
      });
    });

    return () => {
      isMounted = false;
      socket.off("live_data");
      socket.disconnect();
    };
  }, [isHistoryPage]);

  useEffect(() => {
    if (!isHistoryPage) return;

    updateScrollHint();
    const frameId = window.requestAnimationFrame(updateScrollHint);

    window.addEventListener("resize", updateScrollHint);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateScrollHint);
    };
  }, [
    failures,
    isHistoryPage,
    selectedDate,
    selectedFailureFields,
    selectedTypes,
    updateScrollHint,
  ]);

  const displayedFailures = isHistoryPage
    ? failures.filter((failure) => {
        const matchesFailure =
          selectedFailureFields.length === 0 ||
          selectedFailureFields.every((field) => failure[field] === 1);
        const matchesType =
          selectedTypes.length === 0 ||
          selectedTypes.some((type) => failure.type === type);
        const matchesDate =
          selectedDate === "" ||
          toDateInputValue(failure.timestamp) === selectedDate;

        return matchesFailure && matchesType && matchesDate;
      })
    : failures.slice(0, env.maxFailures);

  return (
    <div className="relative h-full min-h-0">
      <div
        ref={scrollContainerRef}
        onScroll={isHistoryPage ? updateScrollHint : undefined}
        className={`scrollbar-none flex h-full min-h-0 flex-col p-8 ${
          isHistoryPage ? "overflow-y-auto pb-12" : "overflow-hidden"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Canlı Uyarı Akışı
          </h2>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-zinc-300">
            {isHistoryPage ? "Tümü" : "Son 4"}
          </span>
        </div>

        {displayedFailures.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-zinc-600">Henüz hata kaydı yok</p>
          </div>
        ) : (
          <div
            className={`mt-4 flex flex-1 flex-col gap-3 ${
              isHistoryPage ? "justify-start" : "justify-evenly"
            }`}
          >
            {displayedFailures.map((failure, index) => {
              const failureDate = failure.timestamp
                ? dateFormatter.format(new Date(failure.timestamp))
                : "--.--.----";
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
                    <span className="w-36 shrink-0 text-sm tabular-nums text-zinc-400">
                      <span>{failureDate}</span>{" "}
                      <span className="text-zinc-300">{failureTime}</span>
                    </span>

                    <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-zinc-300">
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
                      onClick={() => onAnalyze(failure)}
                      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 transition-all duration-200 hover:border-white/25 hover:bg-white/10 active:scale-95"
                    >
                      <span className="relative size-6">
                        <Astroid
                          className="absolute inset-0 text-red-400"
                          size={24}
                          strokeWidth={2.6}
                          style={{
                            clipPath: "polygon(0 0, 100% 0, 50% 50%)",
                          }}
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
                          style={{
                            clipPath: "polygon(0 0, 0 100%, 50% 50%)",
                          }}
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
      {isHistoryPage && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-linear-to-t from-[#171719] via-[#171719]/80 to-transparent pb-5 pt-8 transition-opacity duration-300 ease-out ${
            showScrollHint ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-1 w-12 rounded-full bg-zinc-300/70 shadow-lg shadow-black/30" />
        </div>
      )}
    </div>
  );
}

export default FailureLog;
