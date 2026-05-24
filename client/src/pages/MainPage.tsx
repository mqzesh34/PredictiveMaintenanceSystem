import { useState } from "react";
import AnalysisPanel from "../components/AnalysisPanel";
import FailureLog from "../components/FailureLog";
import { LineMetricCard, ToolWearCard } from "../components/MetricCards";
import TopBar from "../components/TopBar";
import { useLiveTelemetry } from "../services/socketService";
import type { TelemetryData } from "../types/telemetry";

const panelClass = "rounded-[2rem] border border-white/10 bg-[#171719]";

function MainPage() {
  const { data, history, isConnected } = useLiveTelemetry();
  const [selectedFailure, setSelectedFailure] = useState<TelemetryData | null>(
    null,
  );

  return (
    <>
      <TopBar data={data} isConnected={isConnected} />

      <main className="mx-15 mb-8 grid h-(--page-panel-height) grid-cols-[2fr_1fr] items-stretch gap-x-15">
        <section className="grid h-full min-h-0 grid-cols-2 grid-rows-[1fr_1fr_1.55fr] gap-6">
          <div className={panelClass}>
            <LineMetricCard
              title="Makine Sıcaklığı"
              value={data?.processTemperature}
              unit="K"
              color="#f59e0b"
              textColorClass="text-amber-300"
              dataKey="processTemperature"
              history={history}
            />
          </div>
          <div className={panelClass}>
            <LineMetricCard
              title="Motor Devri"
              value={data?.rotationalSpeed}
              unit="RPM"
              color="#93c5fd"
              textColorClass="text-blue-300"
              dataKey="rotationalSpeed"
              history={history}
            />
          </div>
          <div className={panelClass}>
            <LineMetricCard
              title="Tork"
              value={data?.torque}
              unit="Nm"
              color="#22c55e"
              textColorClass="text-emerald-300"
              dataKey="torque"
              history={history}
            />
          </div>
          <div className={panelClass}>
            <ToolWearCard value={data?.toolWear} />
          </div>
          <div className={`${panelClass} col-span-2`}>
            <FailureLog onAnalyze={setSelectedFailure} />
          </div>
        </section>

        <aside className={`${panelClass} h-full min-h-0 overflow-hidden`}>
          <AnalysisPanel selectedFailure={selectedFailure} />
        </aside>
      </main>
    </>
  );
}

export default MainPage;
