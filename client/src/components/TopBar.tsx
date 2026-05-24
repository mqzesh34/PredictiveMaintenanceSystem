import type { TelemetryData } from "../types/telemetry";
import { useLocation, useNavigate } from "react-router-dom";

const timeFormatter = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
function TopBar({
  data,
  isConnected,
}: {
  data: TelemetryData | null;
  isConnected: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const rawProductId = data?.productId;
  const firstChar = rawProductId?.charAt(0).toUpperCase();
  const productType =
    firstChar === "H"
      ? "High"
      : firstChar === "M"
        ? "Medium"
        : firstChar === "L"
          ? "Low"
          : "Null";
  const productTypeClass =
    firstChar === "H"
      ? "text-red-400"
      : firstChar === "M"
        ? "text-yellow-300"
        : firstChar === "L"
          ? "text-emerald-400"
          : "text-white";
  const productId = rawProductId?.slice(1);
  const time = data?.timestamp
    ? timeFormatter.format(new Date(data.timestamp))
    : "--:--:--";
  const connectionClass = isConnected
    ? "border-green-400/70 bg-green-500/15 text-green-300"
    : "border-rose-400/70 bg-rose-500/15 text-rose-300";
  const isMainPage = location.pathname === "/";

  return (
    <div className="mx-15 my-5 flex justify-between text-center items-center flex-row">
      <div className="gap-3 flex items-center text-center">
        <div
          className={`flex items-center gap-2 rounded-full border-2 px-5 py-2 text-base font-medium tabular-nums ${connectionClass}`}
        >
          {time}
        </div>

        <div className="flex gap-2 items-center text-3xl">
          <span className="tabular-nums">
            {productId === undefined ? "00000" : productId}
          </span>

          <span className="text-gray-400 text-3xl font-extrabold">|</span>

          <span className={productTypeClass}>{productType} </span>
        </div>
      </div>
      {isMainPage ? (
        <div
          className={`flex items-center gap-2 rounded-full border-2 px-5 py-2 text-base font-medium hover:bg-gray-800 cursor-pointer transition-colors duration-200 `}
          onClick={() => navigate("/history")}
        >
          Geçmiş Uyarılar
        </div>
      ) : (
        <div
          className={`flex items-center gap-2 rounded-full border-2 px-5 py-2 text-base font-medium hover:bg-gray-800 cursor-pointer transition-colors duration-200 `}
          onClick={() => navigate("/")}
        >
          Ana Sayfa
        </div>
      )}
    </div>
  );
}

export default TopBar;
