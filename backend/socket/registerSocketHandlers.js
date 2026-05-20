const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`Socket bağlandı: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket ayrıldı: ${socket.id}`);
    });
  });
};

module.exports = registerSocketHandlers;
