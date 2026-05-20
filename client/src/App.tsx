import { useEffect, useState } from "react";
import { io } from "socket.io-client";

function App() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:5001");

    socket.on("live_data", (newData) => {
      setData(newData);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <pre>{data ? JSON.stringify(data, null, 2) : "Veri bekleniyor..."}</pre>
    </>
  );
}

export default App;
