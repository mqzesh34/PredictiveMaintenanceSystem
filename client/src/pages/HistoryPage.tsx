import TopBar from "../components/TopBar";
import { useLiveTelemetry } from "../services/socketService";

function HistoryPage() {
  const { data, isConnected } = useLiveTelemetry();

  return (
    <>
      <TopBar data={data} isConnected={isConnected} />
    </>
  );
}

export default HistoryPage;
