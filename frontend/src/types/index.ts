export type UserRole = 'owner' | 'admin' | 'member';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt?: string;
}

export interface BoardMember {
  user: User;
  role: UserRole;
  joinedAt: string;
}

export interface Board {
  _id: string;
  title: string;
  description?: string;
  owner: User;
  members: BoardMember[];
  columns: Array<{
    id: TaskStatus;
    title: string;
    order: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  boardId: string;
  creator: User;
  assignee?: User | null;
  dueDate?: string | null;
  labels: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  _metrics?: {
    clientSentAt?: number;
    serverReceivedAt?: number;
    serverDbWrittenAt?: number;
    serverEmittedAt?: number;
  };
}

export interface LatencyTelemetry {
  lastActionId?: string;
  clientSentAt?: number;
  serverReceivedAt?: number;
  serverDbWrittenAt?: number;
  serverEmittedAt?: number;
  clientReceivedAt?: number;
  totalRoundtripMs?: number;
  serverProcessingMs?: number;
  networkTransitMs?: number;
}

