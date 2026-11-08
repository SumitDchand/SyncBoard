export type UserRole = 'owner' | 'admin' | 'member';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBoardMember {
  user: IUser | string;
  role: UserRole;
  joinedAt: Date;
}

export interface IBoard {
  _id: string;
  title: string;
  description?: string;
  owner: IUser | string;
  members: IBoardMember[];
  columns: Array<{
    id: TaskStatus;
    title: string;
    order: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITask {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  boardId: string;
  creator: IUser | string;
  assignee?: IUser | string | null;
  dueDate?: Date | null;
  labels: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshToken {
  _id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByToken?: string;
  createdAt: Date;
}

// Socket Events Definitions
export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_BOARD: 'board:join',
  LEAVE_BOARD: 'board:leave',
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_MOVE: 'task:move',
  PING_LATENCY: 'ping:latency',

  // Server -> Clients
  BOARD_STATE_SYNC: 'board:state-sync',
  BOARD_MEMBER_JOINED: 'board:member-joined',
  BOARD_MEMBER_LEFT: 'board:member-left',
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_MOVED: 'task:moved',
  ERROR: 'error:occurred',
  PONG_LATENCY: 'pong:latency',
} as const;

export interface LatencyPayload {
  actionId: string;
  clientSentAt: number;
  serverReceivedAt?: number;
  serverDbWrittenAt?: number;
  serverEmittedAt?: number;
}

