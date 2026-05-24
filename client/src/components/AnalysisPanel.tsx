import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity } from "lucide-react";
import { createAiRecommendation } from "../api/aiApi";
import { env } from "../config/env";
import type { TelemetryData } from "../types/telemetry";

const FAILURE_FIELDS = [
  ["twf", "TWF", "Takım aşınması"],
  ["hdf", "HDF", "Isı dağılımı"],
  ["pwf", "PWF", "Güç sapması"],
  ["osf", "OSF", "Aşırı yük"],
  ["rnf", "RNF", "Rastgele sinyal"],
] as const;

const timeFormatter = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const formatValue = (value?: number, fractionDigits = 1) => {
  if (value === undefined) return "--";

  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

const getFailureItems = (failure: TelemetryData) =>
  FAILURE_FIELDS.filter(([key]) => failure[key] === 1);

const getToolWearTextColorClass = (value = 0) =>
  value >= env.maxToolWear
    ? "text-red-400"
    : value >= env.maxToolWear * 0.75
      ? "text-orange-300"
      : value >= env.maxToolWear * 0.5
        ? "text-yellow-300"
        : "text-emerald-400";

const getToolWearPercentage = (value = 0) =>
  Math.min((value / env.maxToolWear) * 100, 100);

type MetricInsight = {
  title: string;
  detail: string;
};

type ParsedRecommendation = {
  cause: string;
  metrics: MetricInsight[];
  fallback: string;
};

const cleanText = (text: string) =>
  text
    .replace(/\*\*/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

const stripActionText = (text: string) =>
  text
    .replace(/\s*[*-]?\s*Aksiyon\s*:[\s\S]*/i, "")
    .replace(/\s*Yapılacak aksiyon\s*:[\s\S]*/i, "")
    .trim();

const stripMetricValues = (text: string) =>
  text.replace(/\s*\([^)]*\)/g, "").trim();

const normalizeProcessLabel = (text: string) =>
  text
    .replace(/proses sıcaklığı/gi, "Makine Sıcaklığı")
    .replace(/\bproses\b/gi, "makine");

const getFirstCompleteSentence = (text: string) => {
  const normalizedText = normalizeProcessLabel(text);
  const firstSentenceMatch = normalizedText.match(/^.*?[.!?](?:\s|$)/);

  return firstSentenceMatch?.[0].trim() || normalizedText.trim();
};

const parseRecommendation = (recommendation: string): ParsedRecommendation => {
  const cleaned = cleanText(recommendation);

  if (cleaned === "") {
    return {
      cause: "",
      metrics: [],
      fallback: "Öneri bekleniyor.",
    };
  }

  const normalized = cleaned
    .replace(/\s+(?=OLASI_NEDEN\s*:)/gi, "\n")
    .replace(/\s+(?=METRIK\s*:)/gi, "\n")
    .replace(/\s+(?=Olası Neden\s*:)/gi, "\n")
    .replace(/\s+(?=Kontrol Edilecek Metrikler)/gi, "\n")
    .replace(/\s+(?=\d+\.\s*[^:]{3,90}:)/g, "\n");

  let cause = "";
  const metrics: MetricInsight[] = [];

  for (const line of normalized.split("\n").map((item) => item.trim())) {
    const causeMatch = line.match(/^OLASI_NEDEN\s*:\s*(.+)$/i);
    if (causeMatch) {
      cause = getFirstCompleteSentence(stripActionText(causeMatch[1]));
      continue;
    }

    const metricMatch = line.match(/^METRIK\s*:\s*(.+)$/i);
    if (!metricMatch) continue;

    const [title = "", ...detailParts] = metricMatch[1]
      .split("|")
      .map((part) => stripActionText(part.trim()));
    const normalizedTitle = normalizeProcessLabel(title);
    const detail = getFirstCompleteSentence(
      stripMetricValues(detailParts.join(" | ").trim()),
    );

    if (normalizedTitle !== "" && detail !== "") {
      metrics.push({
        title: normalizedTitle,
        detail,
      });
    }
  }

  if (metrics.length === 0) {
    const oldCauseMatch = normalized.match(
      /Olası Neden\s*:\s*(.*?)(?:Kontrol Edilecek Metrikler|Kontrol Edilecek Metrikler ve Aksiyonlar|\n\d+\.|$)/i,
    );
    if (!cause && oldCauseMatch) {
      cause = getFirstCompleteSentence(stripActionText(oldCauseMatch[1]));
    }

    const metricMatches = normalized.matchAll(
      /(?:^|\n)\s*\d+\.\s*([^:\n]+):\s*([\s\S]*?)(?=(?:\n\s*\d+\.\s*[^:\n]+:)|$)/g,
    );

    for (const match of metricMatches) {
      const title = stripActionText(match[1]);
      const detail = stripActionText(match[2]);
      const normalizedTitle = normalizeProcessLabel(title);

      if (normalizedTitle !== "" && detail !== "") {
        metrics.push({
          title: normalizedTitle,
          detail: getFirstCompleteSentence(stripMetricValues(detail)),
        });
      }
    }
  }

  return {
    cause,
    metrics,
    fallback: stripActionText(cleaned),
  };
};

function AnalysisPanel({ selectedFailure }: { selectedFailure: TelemetryData | null }) {
  const [recommendation, setRecommendation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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

  const selectedFailureKey = useMemo(() => {
    if (selectedFailure === null) return "";

    return [
      selectedFailure.timestamp,
      selectedFailure.productId,
      selectedFailure.udi,
    ].join("-");
  }, [selectedFailure]);

  useEffect(() => {
    if (selectedFailure === null) {
      return;
    }

    let isMounted = true;

    const loadRecommendation = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setRecommendation("");

      try {
        const aiRecommendation = await createAiRecommendation({
          telemetry: selectedFailure,
        });

        if (isMounted) setRecommendation(aiRecommendation);
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Yapay zeka önerisi alınamadı.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRecommendation();

    return () => {
      isMounted = false;
    };
  }, [selectedFailure, selectedFailureKey]);

  const parsedRecommendation = useMemo(
    () => parseRecommendation(recommendation),
    [recommendation],
  );

  useEffect(() => {
    updateScrollHint();
    const frameId = window.requestAnimationFrame(updateScrollHint);

    window.addEventListener("resize", updateScrollHint);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateScrollHint);
    };
  }, [
    errorMessage,
    isLoading,
    recommendation,
    selectedFailureKey,
    updateScrollHint,
  ]);

  if (selectedFailure === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/4 text-zinc-400">
          <Activity size={24} />
        </div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-white">
          Analiz için bekleniyor
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Canlı uyarı akışından bir kayıt seç
        </p>
      </div>
    );
  }

  const failureItems = getFailureItems(selectedFailure);
  const failureTime = selectedFailure.timestamp
    ? timeFormatter.format(new Date(selectedFailure.timestamp))
    : "--:--:--";
  const failureCodes =
    failureItems.length === 0
      ? "MF"
      : failureItems.map(([, code]) => code).join(" - ");
  const productNumber =
    selectedFailure.productId === undefined
      ? "--"
      : selectedFailure.productId.replace(/^\D+/, "");

  return (
    <div className="relative h-full min-h-0">
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollHint}
        className="scrollbar-none flex h-full min-h-0 flex-col overflow-y-auto p-8 pb-12"
      >
        <div>
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
              AI Analiz
            </p>
            <span className="font-mono text-sm tabular-nums text-zinc-500">
              {failureTime}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {productNumber}
            </h2>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-red-300">
              {failureCodes}
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-white/10 pt-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Hava Sıcaklığı
              </div>
              <p className="mt-2 font-mono text-xl text-amber-300">
                {formatValue(selectedFailure.airTemperature)} K
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Makine Sıcaklığı
              </div>
              <p className="mt-2 font-mono text-xl text-amber-300">
                {formatValue(selectedFailure.processTemperature)} K
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Devir
              </div>
              <p className="mt-2 font-mono text-xl text-blue-300">
                {formatValue(selectedFailure.rotationalSpeed, 0)} rpm
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Aşınma
              </div>
              <p
                className={`mt-2 font-mono text-xl ${getToolWearTextColorClass(
                  selectedFailure.toolWear,
                )}`}
              >
                {formatValue(getToolWearPercentage(selectedFailure.toolWear), 0)} %
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Tork
              </div>
              <p className="mt-2 font-mono text-xl text-emerald-300">
                {formatValue(selectedFailure.torque)} Nm
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Tip
              </div>
              <p className="mt-2 font-mono text-xl text-zinc-100">
                {selectedFailure.type ?? "--"}
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="mb-3 text-sm font-medium text-zinc-300">
              Yapay Zeka Analizi
            </div>
            <div className="min-h-28">
              {isLoading && recommendation === "" ? (
                <div className="rounded-lg border border-white/10 bg-white/3 p-4 text-sm text-zinc-400">
                  Gemini öneri hazırlıyor
                </div>
              ) : errorMessage !== "" ? (
                <p className="rounded-lg border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-300">
                  {errorMessage}
                </p>
              ) : parsedRecommendation.cause !== "" ||
                parsedRecommendation.metrics.length > 0 ? (
                <div className="space-y-3">
                  {parsedRecommendation.cause !== "" && (
                    <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
                        Olası Neden
                      </div>
                      <p className="text-sm leading-6 text-zinc-100">
                        {parsedRecommendation.cause}
                      </p>
                    </div>
                  )}

                  {parsedRecommendation.metrics.length > 0 && (
                    <div className="space-y-3">
                      {parsedRecommendation.metrics.map((metric) => (
                        <div
                          key={`${metric.title}-${metric.detail}`}
                          className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3"
                        >
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            {metric.title}
                          </div>
                          <p className="text-sm leading-6 text-zinc-300">
                            {metric.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-white/10 bg-white/3 p-4 text-sm leading-6 text-zinc-300">
                  {parsedRecommendation.fallback}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-linear-to-t from-[#171719] via-[#171719]/80 to-transparent pb-5 pt-8 transition-opacity duration-300 ease-out ${
          showScrollHint ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-1 w-12 rounded-full bg-zinc-300/70 shadow-lg shadow-black/30" />
      </div>
    </div>
  );
}

export default AnalysisPanel;
