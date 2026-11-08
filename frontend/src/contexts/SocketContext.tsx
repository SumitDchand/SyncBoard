import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { initSocket, getSocket } from '../sockets/socket.client';
import { useAuth } from './AuthContext';
import { User, LatencyTelemetry } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: User[];
  latencyTelemetry: LatencyTelemetry | null;
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  recordUpdateLatency: (metrics?: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [latencyTelemetry, setLatencyTelemetry] = useState<LatencyTelemetry | null>(null);

  useEffect(() => {
    if (user) {
      const s = initSocket();
      setSocket(s);

      const onConnect = () => setIsConnected(true);
      const onDisconnect = () => setIsConnected(false);

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);

      if (s.connected) {
        setIsConnected(true);
      }

      return () => {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
      };
    } else {
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
    }
  }, [user]);

  const recordUpdateLatency = useCallback((metrics?: any) => {
    if (!metrics || !metrics.clientSentAt) return;

    const now = Date.now();
    const clientSentAt = metrics.clientSentAt;
    const serverReceivedAt = metrics.serverReceivedAt || clientSentAt;
    const serverDbWrittenAt = metrics.serverDbWrittenAt || serverReceivedAt;
    const serverEmittedAt = metrics.serverEmittedAt || serverDbWrittenAt;

    const totalRoundtripMs = Math.max(1, now - clientSentAt);
    const serverProcessingMs = Math.max(0, serverDbWrittenAt - serverReceivedAt);
    const networkTransitMs = Math.max(0, totalRoundtripMs - serverProcessingMs);

    setLatencyTelemetry({
      clientSentAt,
      serverReceivedAt,
      serverDbWrittenAt,
      serverEmittedAt,
      clientReceivedAt: now,
      totalRoundtripMs,
      serverProcessingMs,
      networkTransitMs,
    });
  }, []);

  const joinBoard = useCallback(
    (boardId: string) => {
      const s = socket || getSocket();
      if (!s) return;

      s.emit('board:join', { boardId }, (res: any) => {
        if (res?.success && res.data?.onlineUsers) {
          setOnlineUsers(res.data.onlineUsers);
        }
      });

      const onMemberJoined = (data: { user: User; onlineUsers: User[] }) => {
        if (data.onlineUsers) {
          setOnlineUsers(data.onlineUsers);
        }
      };

      const onMemberLeft = (data: { userId: string; onlineUsers: User[] }) => {
        if (data.onlineUsers) {
          setOnlineUsers(data.onlineUsers);
        }
      };

      s.on('board:member-joined', onMemberJoined);
      s.on('board:member-left', onMemberLeft);

      return () => {
        s.off('board:member-joined', onMemberJoined);
        s.off('board:member-left', onMemberLeft);
        s.emit('board:leave', { boardId });
      };
    },
    [socket]
  );

  const leaveBoard = useCallback(
    (boardId: string) => {
      const s = socket || getSocket();
      if (s) {
        s.emit('board:leave', { boardId });
      }
      setOnlineUsers([]);
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        latencyTelemetry,
        joinBoard,
        leaveBoard,
        recordUpdateLatency,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

