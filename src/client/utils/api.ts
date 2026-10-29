/** API ユーティリティ */

export interface User {
  role: 'teacher' | 'admin' | 'participant';
  status?: string;
  user?: {
    id: string;
    email: string;
    lectureName?: string;
    status?: string;
    reviewNote?: string;
  };
}

const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: unknown } | null;
    const message = typeof body?.message === 'string' ? body.message : `HTTP ${res.status}`;
    throw new Error(message);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};