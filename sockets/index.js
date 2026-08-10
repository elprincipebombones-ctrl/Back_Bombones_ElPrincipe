const { Server } = require('socket.io');
const { verificarToken } = require('../utils/jwt');

let io;

const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Autenticación por token opcional
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      socket.usuario = verificarToken(token);
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] Conectado: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] Desconectado: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO no inicializado');
  return io;
};

module.exports = { init, getIO };
