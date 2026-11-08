import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env';
import { socketAuthMiddleware } from './socket.auth';
import { registerSocketHandlers } from './socket.handlers';
import { setSocketIO } from './socket.events';
import { logger } from '../utils/logger';

export const initializeSocketIO = (httpServer: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Attach global instance
  setSocketIO(io);

  // Authentication Middleware
  io.use(socketAuthMiddleware);

  // Connection Handler
  io.on('connection', (socket) => {
    logger.info(`User connected to Socket.IO: ${socket.data.user.name} (${socket.id})`);
    registerSocketHandlers(io, socket);
  });

  return io;
};

