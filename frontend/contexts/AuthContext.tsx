"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/types";
import { userApi } from "@/lib/api";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/lib/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (access: string, refresh: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setState((s) => ({ ...s, user: null, loading: false }));
      return;
    }
    try {
      const user = await userApi.me(token);
      setState((s) => ({ ...s, user, loading: false, error: null }));
    } catch {
      const refresh = getRefreshToken();
      if (refresh) {
        try {
          const { authApi } = await import("@/lib/api");
          const res = await authApi.refresh(refresh);
          setTokens(res.access_token, refresh);
          const user = await userApi.me(res.access_token);
          setState((s) => ({ ...s, user, loading: false, error: null }));
          return;
        } catch {
          clearTokens();
        }
      }
      setState((s) => ({ ...s, user: null, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setState((s) => ({ ...s, user: null, loading: false }));
    window.addEventListener("auth-session-expired", handler);
    return () => window.removeEventListener("auth-session-expired", handler);
  }, []);

  const login = useCallback((access: string, refresh: string) => {
    setTokens(access, refresh);
    setState((s) => ({ ...s, loading: true }));
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    clearTokens();
    setState({ user: null, loading: false, error: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refreshUser: fetchUser,
    }),
    [state, login, logout, fetchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
