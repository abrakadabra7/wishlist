import { AUTH_KEYS } from "./constants";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEYS.ACCESS);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEYS.REFRESH);
}

export function setTokens(access: string, refresh: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEYS.ACCESS, access);
  localStorage.setItem(AUTH_KEYS.REFRESH, refresh);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEYS.ACCESS);
  localStorage.removeItem(AUTH_KEYS.REFRESH);
}
