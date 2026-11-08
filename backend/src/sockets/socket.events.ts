import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export const setSocketIO = (io: SocketIOServer) => {
  ioInstance = io;
};

export const getSocketIO = (): SocketIOServer | null => {
  return ioInstance;
};

export const broadcastToBoard = (
  boardId: string,
  event: string,
  payload: any,
  senderSocketId?: string
) => {
  if (!ioInstance) return;

  const room = `board:${boardId}`;
  if (senderSocketId) {
    ioInstance.to(room).except(senderSocketId).emit(event, payload);
  } else {
    ioInstance.to(room).emit(event, payload);
  }
};

export const emitWithLatencyMetrics = (
  boardId: string,
  event: string,
  data: any,
  timing: {
    clientSentAt?: number;
    serverReceivedAt?: number;
    serverDbWrittenAt?: number;
  },
  senderSocketId?: string
) => {
  const serverEmittedAt = Date.now();

  // Handle Mongoose documents safely to serialize all fields
  const plainData =
    data && typeof data.toObject === 'function'
      ? data.toObject()
      : data && data._doc
      ? { ...data._doc }
      : { ...data };

  if (plainData._id) {
    plainData._id = plainData._id.toString();
  }

  const payload = {
    ...plainData,
    _metrics: {
      clientSentAt: timing.clientSentAt,
      serverReceivedAt: timing.serverReceivedAt,
      serverDbWrittenAt: timing.serverDbWrittenAt,
      serverEmittedAt,
    },
  };

  broadcastToBoard(boardId, event, payload, senderSocketId);
};
