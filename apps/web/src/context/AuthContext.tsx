import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import type { PublicUser } from '@medwatch/shared';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login:   async () => undefined,
  logout:  async () => undefined,
  refresh: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ user: PublicUser }>('/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function login(email: string, password: string) {
    const res = await api.post<{ user: PublicUser }>('/auth/login', { email, password });
    setUser(res.user);
  }

  async function logout() {
    // 1. Clear state first — RequireAuth will immediately redirect to /login
    //    via React Router (client-side, no page reload) so there is no race
    //    condition where /auth/me re-runs before the cookie is cleared.
    setUser(null);
    // 2. Tell the server to expire the httpOnly cookies in the background.
    //    We fire-and-forget; the user is already navigated away by the time
    //    this resolves. Even if it fails, the JWT expires in 15 minutes.
    api.post('/auth/logout').catch(() => { /* best-effort */ });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
