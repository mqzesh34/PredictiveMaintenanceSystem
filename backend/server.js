const http = require("http");
const path = require("path");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = require("./app");
const { BACKEND_PORT, CLIENT_URL } = require("./config/env");
const connectDB = require("./config/db");
const startMqttClient = require("./service/mqttService");
const registerSocketHandlers = require("./socket/registerSocketHandlers");

function createSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: CLIENT_URL,
      credentials: true,
    },
  });

  registerSocketHandlers(io);

  return io;
}

function listen(server) {
  server.listen(BACKEND_PORT, () => {
    console.log(`Backend servisi ${BACKEND_PORT} üzerinde çalışıyor`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `${BACKEND_PORT} portu kullanımda. BACKEND_PORT değerini değiştir.`,
      );
      process.exit(1);
    }

    console.error("Backend server hatası:", err.message);
    process.exit(1);
  });
}

async function startServer() {
  await connectDB();

  const server = http.createServer(app);
  const io = createSocketServer(server);

  app.set("io", io);
  startMqttClient(io);
  listen(server);
}

startServer().catch((err) => {
  console.error("Backend başlatma hatası:", err.message);
  process.exit(1);
});
