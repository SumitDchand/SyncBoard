import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { createApp } from '../src/app';
import { initializeSocketIO } from '../src/sockets/socket.server';
import { AuthService } from '../src/services/auth.service';
import { BoardService } from '../src/services/board.service';
import { SOCKET_EVENTS } from '../src/types';

describe('Real-Time Socket.IO Synchronization Multi-Client Tests', () => {
  let server: http.Server;
  let serverPort: number;
  let user1Token: string;
  let user2Token: string;
  let boardId: string;
  let clientA: ClientSocketType;
  let clientB: ClientSocketType;

  beforeAll(async () => {
    // Start HTTP server & Socket.IO
    const app = createApp();
    server = http.createServer(app);
    initializeSocketIO(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    // Register users and create board fresh for each test so setup.ts collection purge doesn't invalidate them
    const user1 = await AuthService.register('User Alpha', `alpha_${Date.now()}@syncboard.dev`, 'Password123!');
    const user2 = await AuthService.register('User Beta', `beta_${Date.now()}@syncboard.dev`, 'Password123!');

    user1Token = user1.accessToken;
    user2Token = user2.accessToken;

    const board = await BoardService.createBoard('Live Sync Board', 'Realtime Testing', user1.user.id.toString());
    boardId = board._id.toString();

    await BoardService.addMember(boardId, user1.user.id.toString(), user2.user.email, 'member');
  });

  afterEach(() => {
    if (clientA && clientA.connected) clientA.disconnect();
    if (clientB && clientB.connected) clientB.disconnect();
  });

  it('should authenticate both clients and join the shared board room', async () => {
    clientA = ClientSocket(`http://127.0.0.1:${serverPort}`, {
      auth: { token: user1Token },
      transports: ['websocket'],
    });

    clientB = ClientSocket(`http://127.0.0.1:${serverPort}`, {
      auth: { token: user2Token },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve) => clientA.on('connect', resolve)),
      new Promise<void>((resolve) => clientB.on('connect', resolve)),
    ]);

    expect(clientA.connected).toBe(true);
    expect(clientB.connected).toBe(true);

    // Both join the board
    const joinARes = await new Promise<any>((resolve) => {
      clientA.emit(SOCKET_EVENTS.JOIN_BOARD, { boardId }, (res: any) => resolve(res));
    });
    expect(joinARes.success).toBe(true);

    const joinBRes = await new Promise<any>((resolve) => {
      clientB.emit(SOCKET_EVENTS.JOIN_BOARD, { boardId }, (res: any) => resolve(res));
    });
    expect(joinBRes.success).toBe(true);
  });

  it('should broadcast task:created from Client A to Client B in real-time', async () => {
    clientA = ClientSocket(`http://127.0.0.1:${serverPort}`, {
      auth: { token: user1Token },
      transports: ['websocket'],
    });

    clientB = ClientSocket(`http://127.0.0.1:${serverPort}`, {
      auth: { token: user2Token },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve) => clientA.on('connect', resolve)),
      new Promise<void>((resolve) => clientB.on('connect', resolve)),
    ]);

    await new Promise<any>((resolve) => clientA.emit(SOCKET_EVENTS.JOIN_BOARD, { boardId }, resolve));
    await new Promise<any>((resolve) => clientB.emit(SOCKET_EVENTS.JOIN_BOARD, { boardId }, resolve));

    const taskPayload = {
      boardId,
      title: 'Real-time sync test task',
      description: 'Testing websocket broadcast',
      status: 'todo',
      priority: 'high',
      clientSentAt: Date.now(),
    };

    const taskReceivedPromise = new Promise<any>((resolve) => {
      clientB.once(SOCKET_EVENTS.TASK_CREATED, (data) => {
        resolve(data);
      });
    });

    clientA.emit(SOCKET_EVENTS.TASK_CREATE, taskPayload);

    const receivedTask = await taskReceivedPromise;
    expect(receivedTask.title).toBe(taskPayload.title);
    expect(receivedTask.status).toBe('todo');
    expect(receivedTask._metrics).toBeDefined();
    expect(receivedTask._metrics.serverEmittedAt).toBeGreaterThanOrEqual(receivedTask._metrics.clientSentAt);
  });

  it('should broadcast task:moved when task is moved by Client A', async () => {
    clientA = ClientSocket(`http://127.0.0.1:${serverPort}`, {
      auth: { token: user1Token },
      transports: ['websocket'],
    });

    clientB = ClientSocket(`http://127.0.0.1:${serverPort}`, {
      auth: { token: user2Token },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((resolve) => clientA.on('connect', resolve)),
      new Promise<void>((resolve) => clientB.on('connect', resolve)),
    ]);

    await new Promise<any>((resolve) => clientA.emit(SOCKET_EVENTS.JOIN_BOARD, { boardId }, resolve));
    await new Promise<any>((resolve) => clientB.emit(SOCKET_EVENTS.JOIN_BOARD, { boardId }, resolve));

    // First create a task via Client A
    const createRes = await new Promise<any>((resolve) => {
      clientA.emit(
        SOCKET_EVENTS.TASK_CREATE,
        { boardId, title: 'Move Me Task', status: 'todo' },
        (res: any) => resolve(res)
      );
    });

    const taskId = createRes.data._id;

    const taskMovedPromise = new Promise<any>((resolve) => {
      clientB.once(SOCKET_EVENTS.TASK_MOVED, (data) => {
        resolve(data);
      });
    });

    clientA.emit(SOCKET_EVENTS.TASK_MOVE, {
      taskId,
      status: 'in_progress',
      order: 0,
      clientSentAt: Date.now(),
    });

    const movedTask = await taskMovedPromise;
    expect(movedTask._id).toBe(taskId);
    expect(movedTask.status).toBe('in_progress');
  });

  it('should respond to ping:latency for RTT measurement', async () => {
    clientA = ClientSocket(`http://127.0.0.1:${serverPort}`, {
      auth: { token: user1Token },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => clientA.on('connect', resolve));

    const pingTime = Date.now();
    const pong = await new Promise<any>((resolve) => {
      clientA.emit(SOCKET_EVENTS.PING_LATENCY, { clientSentAt: pingTime }, (res: any) =>
        resolve(res)
      );
    });

    expect(pong.clientSentAt).toBe(pingTime);
    expect(pong.serverTimestamp).toBeGreaterThanOrEqual(pingTime);
  });

  it('should reject unauthenticated socket connection', async () => {
    const badClient = ClientSocket(`http://127.0.0.1:${serverPort}`, {
      auth: { token: 'invalid_token' },
      transports: ['websocket'],
    });

    const connectError = await new Promise<any>((resolve) => {
      badClient.on('connect_error', (err) => resolve(err.message));
    });

    expect(connectError).toContain('Authentication error');
    badClient.disconnect();
  });
});
