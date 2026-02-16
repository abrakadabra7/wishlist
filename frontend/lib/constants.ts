const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "") || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const WS_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_WS_URL || "").replace(/\/$/, "") ||
      (API_BASE.replace(/^http/, "ws"))
    : "";

export const API_URL = API_BASE;
export const API_V1 = `${API_BASE}/api/v1`;
export const WS_URL = `${WS_BASE}/api/v1/ws`;

export const AUTH_KEYS = {
  ACCESS: "wishlist_access_token",
  REFRESH: "wishlist_refresh_token",
} as const;
