import { Server as SocketIOServer, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../types';
import { BoardService } from '../services/board.service';
import { TaskService } from '../services/task.service';
import { emitWithLatencyMetrics } from './socket.events';
import { logger } from '../utils/logger';

// Board presence tracking: boardId -> Map<userId, { user: any, socketIds: Set<string> }>
const boardPresence = new Map<
  string,
  Map<string, { user: any; socketIds: Set<string> }>
>();

export const registerSocketHandlers = (io: SocketIOServer, socket: Socket) => {
  const user = socket.data.user;

  // 1. Join Board Room with strict authorization check & state sync
  socket.on(
    SOCKET_EVENTS.JOIN_BOARD,
    async ({ boardId }: { boardId: string }, callback?: (res: any) => void) => {
      try {
        if (!boardId) {
          if (callback) callback({ success: false, message: 'Board ID is required' });
          return;
        }

        // Verify user is authorized for this board
        const board = await BoardService.getBoardById(boardId, user.id);
        const tasks = await TaskService.getTasks(boardId, user.id);

        const room = `board:${boardId}`;
        socket.join(room);

        // Update presence
        if (!boardPresence.has(boardId)) {
          boardPresence.set(boardId, new Map());
        }
        const boardUsers = boardPresence.get(boardId)!;

        if (!boardUsers.has(user.id)) {
          boardUsers.set(user.id, { user, socketIds: new Set([socket.id]) });
        } else {
          boardUsers.get(user.id)!.socketIds.add(socket.id);
        }

        // Collect list of online users on this board
        const onlineUsers = Array.from(boardUsers.values()).map((entry) => entry.user);

        // Broadcast to other board members that user joined
        socket.to(room).emit(SOCKET_EVENTS.BOARD_MEMBER_JOINED, {
          user,
          onlineUsers,
        });

        // Send full state synchronization to the joined client
        const syncPayload = {
          board,
          tasks,
          onlineUsers,
        };

        socket.emit(SOCKET_EVENTS.BOARD_STATE_SYNC, syncPayload);

        logger.debug(`User ${user.name} joined board room: ${room}`);
        if (callback) callback({ success: true, data: syncPayload });
      } catch (err: any) {
        logger.error(`Error joining board room ${boardId}:`, err.message);
        socket.emit(SOCKET_EVENTS.ERROR, { message: err.message || 'Failed to join board' });
        if (callback) callback({ success: false, message: err.message });
      }
    }
  );

  // 2. Leave Board Room
  socket.on(
    SOCKET_EVENTS.LEAVE_BOARD,
    ({ boardId }: { boardId: string }, callback?: (res: any) => void) => {
      try {
        const room = `board:${boardId}`;
        socket.leave(room);

        if (boardPresence.has(boardId)) {
          const boardUsers = boardPresence.get(boardId)!;
          if (boardUsers.has(user.id)) {
            const entry = boardUsers.get(user.id)!;
            entry.socketIds.delete(socket.id);
            if (entry.socketIds.size === 0) {
              boardUsers.delete(user.id);
            }
          }
          const onlineUsers = Array.from(boardUsers.values()).map((entry) => entry.user);

          socket.to(room).emit(SOCKET_EVENTS.BOARD_MEMBER_LEFT, {
            userId: user.id,
            onlineUsers,
          });
        }

        logger.debug(`User ${user.name} left board room: ${room}`);
        if (callback) callback({ success: true });
      } catch (err: any) {
        if (callback) callback({ success: false, message: err.message });
      }
    }
  );

  // 3. Real-Time Task Creation via Socket
  socket.on(
    SOCKET_EVENTS.TASK_CREATE,
    async (payload: any, callback?: (res: any) => void) => {
      const serverReceivedAt = Date.now();
      try {
        const { boardId, title, description, status, priority, assignee, dueDate, labels, clientSentAt } =
          payload;

        const task = await TaskService.createTask(boardId, user.id, {
          title,
          description,
          status,
          priority,
          assignee,
          dueDate,
          labels,
        });

        const serverDbWrittenAt = Date.now();

        // Broadcast to other collaborators on this board
        emitWithLatencyMetrics(
          boardId,
          SOCKET_EVENTS.TASK_CREATED,
          task,
          {
            clientSentAt,
            serverReceivedAt,
            serverDbWrittenAt,
          },
          socket.id // Exclude sender from broadcast if they receive acknowledgment
        );

        if (callback) {
          callback({
            success: true,
            data: task,
            _metrics: {
              clientSentAt,
              serverReceivedAt,
              serverDbWrittenAt,
              serverEmittedAt: Date.now(),
            },
          });
        }
      } catch (err: any) {
        logger.error('Socket task:create error:', err.message);
        if (callback) callback({ success: false, message: err.message });
      }
    }
  );

  // 4. Real-Time Task Update via Socket
  socket.on(
    SOCKET_EVENTS.TASK_UPDATE,
    async (payload: any, callback?: (res: any) => void) => {
      const serverReceivedAt = Date.now();
      try {
        const { taskId, boardId, clientSentAt, ...updateData } = payload;

        const updatedTask = await TaskService.updateTask(taskId, user.id, updateData);
        const serverDbWrittenAt = Date.now();

        emitWithLatencyMetrics(
          updatedTask.boardId.toString(),
          SOCKET_EVENTS.TASK_UPDATED,
          updatedTask,
          {
            clientSentAt,
            serverReceivedAt,
            serverDbWrittenAt,
          },
          socket.id
        );

        if (callback) {
          callback({
            success: true,
            data: updatedTask,
            _metrics: {
              clientSentAt,
              serverReceivedAt,
              serverDbWrittenAt,
              serverEmittedAt: Date.now(),
            },
          });
        }
      } catch (err: any) {
        logger.error('Socket task:update error:', err.message);
        if (callback) callback({ success: false, message: err.message });
      }
    }
  );

  // 5. Real-Time Task Move (Drag & Drop) via Socket
  socket.on(
    SOCKET_EVENTS.TASK_MOVE,
    async (payload: any, callback?: (res: any) => void) => {
      const serverReceivedAt = Date.now();
      try {
        const { taskId, status, order, clientSentAt } = payload;

        const movedTask = await TaskService.moveTask(taskId, user.id, status, order);
        const serverDbWrittenAt = Date.now();

        emitWithLatencyMetrics(
          movedTask.boardId.toString(),
          SOCKET_EVENTS.TASK_MOVED,
          movedTask,
          {
            clientSentAt,
            serverReceivedAt,
            serverDbWrittenAt,
          },
          socket.id
        );

        if (callback) {
          callback({
            success: true,
            data: movedTask,
            _metrics: {
              clientSentAt,
              serverReceivedAt,
              serverDbWrittenAt,
              serverEmittedAt: Date.now(),
            },
          });
        }
      } catch (err: any) {
        logger.error('Socket task:move error:', err.message);
        if (callback) callback({ success: false, message: err.message });
      }
    }
  );

  // 6. Real-Time Task Delete via Socket
  socket.on(
    SOCKET_EVENTS.TASK_DELETE,
    async (payload: any, callback?: (res: any) => void) => {
      const serverReceivedAt = Date.now();
      try {
        const { taskId } = payload;
        const result = await TaskService.deleteTask(taskId, user.id);
        const serverDbWrittenAt = Date.now();

        emitWithLatencyMetrics(
          result.boardId,
          SOCKET_EVENTS.TASK_DELETED,
          result,
          {
            serverReceivedAt,
            serverDbWrittenAt,
          },
          socket.id
        );

        if (callback) {
          callback({
            success: true,
            data: result,
            _metrics: {
              serverReceivedAt,
              serverDbWrittenAt,
              serverEmittedAt: Date.now(),
            },
          });
        }
      } catch (err: any) {
        logger.error('Socket task:delete error:', err.message);
        if (callback) callback({ success: false, message: err.message });
      }
    }
  );

  // 7. Latency Ping-Pong Measurement
  socket.on(SOCKET_EVENTS.PING_LATENCY, (data: any, callback?: (res: any) => void) => {
    const response = {
      clientSentAt: data?.clientSentAt,
      serverTimestamp: Date.now(),
    };
    if (callback) callback(response);
    else socket.emit(SOCKET_EVENTS.PONG_LATENCY, response);
  });

  // 8. Handle Disconnection & Cleanup
  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${user.name} (${socket.id})`);

    // Clean up presence across boards
    for (const [boardId, boardUsers] of boardPresence.entries()) {
      if (boardUsers.has(user.id)) {
        const entry = boardUsers.get(user.id)!;
        entry.socketIds.delete(socket.id);
        if (entry.socketIds.size === 0) {
          boardUsers.delete(user.id);

          const room = `board:${boardId}`;
          const onlineUsers = Array.from(boardUsers.values()).map((e) => e.user);

          socket.to(room).emit(SOCKET_EVENTS.BOARD_MEMBER_LEFT, {
            userId: user.id,
            onlineUsers,
          });
        }
      }
    }
  });
};

