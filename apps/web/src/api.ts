/**
 * Thin fetch wrapper — all API calls go through this module.
 * In dev, BASE defaults to '/api' which Vite proxies to localhost:3001.
 * In production, BASE uses VITE_API_BASE_URL (Render backend service host/URL).
 * credentials:'include' is required so the httpOnly JWT cookie is sent on every request.
 */
const envUrl = import.meta.env.VITE_API_BASE_URL;
const BASE = envUrl
  ? (envUrl.startsWith('http://') || envUrl.startsWith('https://') ? envUrl : `https://${envUrl}`)
  : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',                  // always send cookies
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                  => request<T>(path),
  post:   <T>(path: string, body?: unknown)  => request<T>(path, { method: 'POST',   body: body !== undefined ? JSON.stringify(body) : undefined }),
  put:    <T>(path: string, body?: unknown)  => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown)  => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                  => request<T>(path, { method: 'DELETE' }),
};
