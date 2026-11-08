let currentAccessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

export const setAccessToken = (token: string | null) => {
  currentAccessToken = token;
  if (token) {
    localStorage.setItem('syncboard_token', token);
  } else {
    localStorage.removeItem('syncboard_token');
  }
};

export const getAccessToken = (): string | null => {
  if (!currentAccessToken) {
    currentAccessToken = localStorage.getItem('syncboard_token');
  }
  return currentAccessToken;
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: any;
}

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes httpOnly cookies for refresh token
  });

  // Handle 401 Unauthorized for token refresh
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newToken = refreshData.data.accessToken;
          setAccessToken(newToken);
          isRefreshing = false;
          onRefreshed(newToken);

          // Retry the original request
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryRes = await fetch(url, { ...options, headers, credentials: 'include' });
          return await retryRes.json();
        } else {
          // Refresh failed - log out
          setAccessToken(null);
          isRefreshing = false;
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
      } catch (err) {
        setAccessToken(null);
        isRefreshing = false;
        throw err;
      }
    } else {
      // Queue requests until token refreshed
      return new Promise((resolve) => {
        refreshSubscribers.push(async (newToken: string) => {
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryRes = await fetch(url, { ...options, headers, credentials: 'include' });
          resolve(await retryRes.json());
        });
      });
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.message || data?.errors?.[0]?.message || 'Request failed';
    throw new Error(errorMsg);
  }

  return data;
};

