import TopBar from "../components/TopBar";
import { useLiveTelemetry } from "../services/socketService";
import AnalysisPanel from "../components/AnalysisPanel";
import { useState } from "react";
import type { TelemetryData } from "../types/telemetry";
import FailureLog, {
  FailureFilterBar,
  type FailureField,
  type MachineType,
} from "../components/FailureLog";

const panelClass = "rounded-[2rem] border border-white/10 bg-[#171719]";

function HistoryPage() {
  const { data, isConnected } = useLiveTelemetry();
  const [selectedFailure, setSelectedFailure] = useState<TelemetryData | null>(
    null,
  );
  const [selectedFailureFields, setSelectedFailureFields] = useState<
    FailureField[]
  >([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<MachineType[]>([]);

  const toggleFailureField = (field: FailureField) => {
    setSelectedFailureFields((currentFields) =>
      currentFields.includes(field)
        ? currentFields.filter((currentField) => currentField !== field)
        : [...currentFields, field],
    );
  };

  const toggleType = (type: MachineType) => {
    setSelectedTypes((currentTypes) =>
      currentTypes.includes(type)
        ? currentTypes.filter((currentType) => currentType !== type)
        : [...currentTypes, type],
    );
  };

  const clearFilters = () => {
    setSelectedFailureFields([]);
    setSelectedDate("");
    setSelectedTypes([]);
  };

  return (
    <>
      <TopBar data={data} isConnected={isConnected} />

      <main className="mx-15 mb-8 grid h-(--page-panel-height) grid-cols-[2fr_1fr] items-stretch gap-x-15">
        <section className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-6">
          <div className={panelClass}>
            <FailureFilterBar
              selectedFailureFields={selectedFailureFields}
              selectedDate={selectedDate}
              selectedTypes={selectedTypes}
              onDateChange={setSelectedDate}
              onToggleFailureField={toggleFailureField}
              onToggleType={toggleType}
              onClear={clearFilters}
            />
          </div>

          <div className={`${panelClass} min-h-0 overflow-hidden`}>
            <FailureLog
              onAnalyze={setSelectedFailure}
              isHistoryPage
              selectedDate={selectedDate}
              selectedFailureFields={selectedFailureFields}
              selectedTypes={selectedTypes}
            />
          </div>
        </section>
        <aside className={`${panelClass} h-full min-h-0 overflow-hidden`}>
          <AnalysisPanel selectedFailure={selectedFailure} />
        </aside>
      </main>
    </>
  );
}

export default HistoryPage;
