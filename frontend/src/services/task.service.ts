import { apiFetch } from './api';
import { Task, TaskPriority, TaskStatus } from '../types';

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string | null;
  dueDate?: string | null;
  labels?: string[];
  clientSentAt?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string | null;
  dueDate?: string | null;
  labels?: string[];
  order?: number;
  version?: number;
  clientSentAt?: number;
}

export const taskService = {
  async getTasks(boardId: string, params?: { status?: string; priority?: string; search?: string; sortBy?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.search) query.append('search', params.search);
    if (params?.sortBy) query.append('sortBy', params.sortBy);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await apiFetch<Task[]>(`/boards/${boardId}/tasks${queryString}`);
    return res.data;
  },

  async createTask(boardId: string, data: CreateTaskInput) {
    const payload = {
      ...data,
      clientSentAt: data.clientSentAt || Date.now(),
    };
    const res = await apiFetch<Task>(`/boards/${boardId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateTask(taskId: string, data: UpdateTaskInput) {
    const payload = {
      ...data,
      clientSentAt: data.clientSentAt || Date.now(),
    };
    const res = await apiFetch<Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async moveTask(taskId: string, status: TaskStatus, order: number) {
    const clientSentAt = Date.now();
    const res = await apiFetch<Task>(`/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ status, order, clientSentAt }),
    });
    return res.data;
  },

  async deleteTask(taskId: string) {
    const res = await apiFetch<{ taskId: string; boardId: string }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
    return res.data;
  },
};

