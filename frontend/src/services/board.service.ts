import { apiFetch } from './api';
import { Board, BoardMember } from '../types';

export const boardService = {
  async getBoards() {
    const res = await apiFetch<Board[]>('/boards');
    return res.data;
  },

  async getBoardById(boardId: string) {
    const res = await apiFetch<Board>(`/boards/${boardId}`);
    return res.data;
  },

  async createBoard(title: string, description?: string) {
    const res = await apiFetch<Board>('/boards', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
    return res.data;
  },

  async updateBoard(boardId: string, title?: string, description?: string) {
    const res = await apiFetch<Board>(`/boards/${boardId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, description }),
    });
    return res.data;
  },

  async deleteBoard(boardId: string) {
    const res = await apiFetch<{ message: string }>(`/boards/${boardId}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  async addMember(boardId: string, email: string, role: 'admin' | 'member' = 'member') {
    const res = await apiFetch<Board>(`/boards/${boardId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
    return res.data;
  },

  async removeMember(boardId: string, userId: string) {
    const res = await apiFetch<Board>(`/boards/${boardId}/members/${userId}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  async getMembers(boardId: string) {
    const res = await apiFetch<BoardMember[]>(`/boards/${boardId}/members`);
    return res.data;
  },
};

