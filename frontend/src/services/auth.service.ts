import { apiFetch, setAccessToken } from './api';
import { User } from '../types';

export const authService = {
  async register(name: string, email: string, password: string) {
    const res = await apiFetch<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }
    );
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async login(email: string, password: string) {
    const res = await apiFetch<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  async getMe() {
    const res = await apiFetch<User>('/auth/me');
    return res.data;
  },
};

