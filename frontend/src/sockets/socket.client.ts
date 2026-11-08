import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../services/api';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  return socket;
};

export const initSocket = (): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  const token = getAccessToken();

  // In development/production Vite proxies or direct connect
  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to real-time server:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

