import { useEffect, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { env } from "../config/env";
import type { TelemetryData } from "../types/telemetry";

type MetricKey =
  | "airTemperature"
  | "processTemperature"
  | "rotationalSpeed"
  | "torque";

type ChartPoint = {
  name: number;
  value: number;
  timestamp?: string;
};

const formatValue = (value?: number, fractionDigits = 1) => {
  if (value === undefined) return "--";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

const formatChartTime = (timestamp?: string) => {
  if (!timestamp) return "--.--.--";

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .format(new Date(timestamp))
    .replaceAll(":", ".");
};

const getToolWearPercentage = (value = 0) =>
  Math.min((value / env.maxToolWear) * 100, 100);

const buildAveragedChartData = (
  history: TelemetryData[],
  dataKey: MetricKey,
) => {
  const validData = history
    .filter((item) => item[dataKey] !== undefined && item.timestamp)
    .slice(-env.rawChartPointLimit);

  const latestTimestamp = validData.at(-1)?.timestamp;
  const latestTime = latestTimestamp
    ? new Date(latestTimestamp).getTime()
    : Number.NaN;
  const activeBucketKey = Math.floor(latestTime / env.telemetryBucketDurationMs);

  const buckets = new Map<
    number,
    {
      total: number;
      count: number;
    }
  >();

  for (const item of validData) {
    if (!item.timestamp) continue;

    const value = item[dataKey];
    if (value === undefined) continue;

    const time = new Date(item.timestamp).getTime();

    if (Number.isNaN(time)) continue;

    const bucketKey = Math.floor(time / env.telemetryBucketDurationMs);
    if (bucketKey >= activeBucketKey) continue;

    const bucket = buckets.get(bucketKey);

    if (bucket === undefined) {
      buckets.set(bucketKey, { total: value, count: 1 });
      continue;
    }

    bucket.total += value;
    bucket.count += 1;
  }

  return Array.from(buckets.entries())
    .sort(([firstKey], [secondKey]) => firstKey - secondKey)
    .slice(-env.chartPointLimit)
    .map(([bucketKey, bucket], index) => ({
      name: index,
      value: bucket.total / bucket.count,
      timestamp: new Date(
        (bucketKey + 1) * env.telemetryBucketDurationMs,
      ).toISOString(),
    }));
};

function LineMetricCard({
  title,
  value,
  unit,
  color,
  textColorClass,
  dataKey,
  history,
}: {
  title: string;
  value?: number;
  unit: string;
  color: string;
  textColorClass: string;
  dataKey: MetricKey;
  history: TelemetryData[];
}) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const lastBuiltBucketKey = useRef<number | null>(null);
  const latestTimestamp = history.at(-1)?.timestamp;
  const latestTime = latestTimestamp
    ? new Date(latestTimestamp).getTime()
    : Number.NaN;
  const latestCompletedBucketKey = Number.isNaN(latestTime)
    ? null
    : Math.floor(latestTime / env.telemetryBucketDurationMs) - 1;

  useEffect(() => {
    if (latestCompletedBucketKey === null) return;
    if (lastBuiltBucketKey.current === latestCompletedBucketKey) return;

    lastBuiltBucketKey.current = latestCompletedBucketKey;
    setChartData(buildAveragedChartData(history, dataKey));
  }, [dataKey, history, latestCompletedBucketKey]);

  const endTimestamp = chartData.at(-1)?.timestamp;
  const endTimeMs = endTimestamp
    ? new Date(endTimestamp).getTime()
    : Number.NaN;
  const startTimestamp = Number.isNaN(endTimeMs)
    ? undefined
    : new Date(endTimeMs - env.rawChartPointLimit * 1000).toISOString();
  const startTime = formatChartTime(startTimestamp);
  const endTime = formatChartTime(endTimestamp);

  return (
    <div className="flex h-full flex-col justify-between p-8">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
          {title}
        </p>
        <p
          className={`shrink-0 font-mono text-3xl font-semibold ${textColorClass}`}
        >
          {formatValue(value)}{" "}
          <span className="text-base text-zinc-400">{unit}</span>
        </p>
      </div>

      <div>
        <div className="h-24 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  const point = payload?.[0];

                  if (!active) return null;
                  if (!point) return null;

                  return (
                    <div className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100">
                      <div className="text-zinc-500">
                        {formatChartTime(point.payload?.timestamp)}
                      </div>
                      <div>
                        {formatValue(Number(point.value))}{" "}
                        <span className="text-zinc-400">{unit}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex justify-between font-mono text-xs text-zinc-500 tabular-nums">
          <span>{startTime}</span>
          <span>{endTime}</span>
        </div>
      </div>
    </div>
  );
}

function ToolWearCard({ value = 0 }: { value?: number }) {
  const wearPercentage = getToolWearPercentage(value);
  const progressWidth = `${wearPercentage}%`;
  const barColorClass =
    value >= env.maxToolWear
      ? "bg-red-500"
      : value >= env.maxToolWear * 0.75
        ? "bg-orange-400"
        : value >= env.maxToolWear * 0.5
          ? "bg-yellow-300"
          : "bg-emerald-500";
  const textColorClass =
    value >= env.maxToolWear
      ? "text-red-400"
      : value >= env.maxToolWear * 0.75
        ? "text-orange-300"
        : value >= env.maxToolWear * 0.5
          ? "text-yellow-300"
          : "text-emerald-400";

  return (
    <div className="flex h-full flex-col justify-between p-8">
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Takım Aşınması
          </p>
          <p
            className={`shrink-0 font-mono text-3xl font-semibold ${textColorClass}`}
          >
            {formatValue(wearPercentage, 0)}{" "}
            <span className="text-base text-zinc-400">%</span>
          </p>
        </div>
      </div>

      <div>
        <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-out ${barColorClass}`}
            style={{ width: progressWidth }}
          />
        </div>
        <div className="mt-3 flex justify-between font-mono text-xs text-zinc-500 tabular-nums">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

export { LineMetricCard, ToolWearCard };
