import { API_V1 } from "./constants";
import { getAccessToken, clearTokens } from "./auth";
import type {
  User,
  Wishlist,
  WishlistWithProgress,
  WishlistItem,
  TokenResponse,
  PublicWishlistResponse,
  Share,
  PublicLink,
  DeleteImpact,
  Notification,
  WishlistSuggestion,
} from "@/types";

export type ReservationConflictError = Error & {
  code: "reservation_conflict";
  current_item?: WishlistItem;
};

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function request<T>(
  path: string,
  options: { method?: Method; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const { method = "GET", body, token } = options;
  const access = token ?? (typeof window !== "undefined" ? getAccessToken() : null);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (access) headers["Authorization"] = `Bearer ${access}`;

  const res = await fetch(`${API_V1}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearTokens();
      window.dispatchEvent(new Event("auth-session-expired"));
    }
    const detail = data.detail;
    if (res.status === 409 && typeof detail === "object" && detail?.code === "reservation_conflict") {
      const err = new Error(detail.message || "Reservation conflict") as Error & {
        code: string;
        current_item?: WishlistItem;
      };
      err.code = "reservation_conflict";
      err.current_item = detail.current_item;
      throw err;
    }
    // 422 validation: detail is array of { msg, loc }
    if (res.status === 422 && Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      const msg = first?.msg ?? (typeof first === "string" ? first : "Validation error");
      throw new Error(typeof msg === "string" ? msg : "Validation error");
    }
    throw new Error(
      typeof detail === "string" ? detail : (detail && typeof detail === "object" && "message" in detail ? (detail as { message: string }).message : null) ?? res.statusText ?? "Request failed"
    );
  }
  return data as T;
}

// Auth
export const authApi = {
  register: (email: string, password: string, display_name?: string) =>
    request<TokenResponse>("/auth/register", {
      method: "POST",
      body: { email, password, display_name: display_name || null },
    }),
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: { email, password } }),
  refresh: (refreshToken: string) =>
    request<{ access_token: string }>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    }),
};

// User
export const userApi = {
  me: (token?: string | null) => request<User>("/users/me", { token }),
  updateMe: (data: { display_name?: string; avatar_url?: string }, token?: string | null) =>
    request<User>("/users/me", { method: "PATCH", body: data, token }),
};

// Wishlists
export const wishlistApi = {
  list: (token?: string | null) => request<WishlistWithProgress[]>("/wishlists", { token }),
  get: (id: string, token?: string | null) => request<Wishlist>(`/wishlists/${id}`, { token }),
  create: (
    data: { title: string; description?: string; is_public?: boolean; due_date?: string | null },
    token?: string | null
  ) => request<Wishlist>("/wishlists", { method: "POST", body: data, token }),
  update: (
    id: string,
    data: { title?: string; description?: string; is_public?: boolean; due_date?: string | null; sort_order?: number },
    token?: string | null
  ) => request<Wishlist>(`/wishlists/${id}`, { method: "PATCH", body: data, token }),
  getDeleteImpact: (id: string, token?: string | null) =>
    request<DeleteImpact>(`/wishlists/${id}/delete-impact`, { token }),
  delete: (id: string, token?: string | null) =>
    request<void>(`/wishlists/${id}`, { method: "DELETE", token }),
  reorder: (order: { id: string; sort_order: number }[], token?: string | null) =>
    request<WishlistWithProgress[]>("/wishlists/reorder", {
      method: "PATCH",
      body: { order },
      token,
    }),
  listSuggestions: (wishlistId: string, token?: string | null) =>
    request<WishlistSuggestion[]>(`/wishlists/${wishlistId}/suggestions`, { token }),
  acceptSuggestion: (wishlistId: string, suggestionId: string, token?: string | null) =>
    request<void>(`/wishlists/${wishlistId}/suggestions/${suggestionId}/accept`, {
      method: "POST",
      token,
    }),
  rejectSuggestion: (wishlistId: string, suggestionId: string, token?: string | null) =>
    request<void>(`/wishlists/${wishlistId}/suggestions/${suggestionId}/reject`, {
      method: "POST",
      token,
    }),
};

// Items
export const itemApi = {
  list: (wishlistId: string, token?: string | null) =>
    request<WishlistItem[]>(`/wishlists/${wishlistId}/items`, { token }),
  create: (
    wishlistId: string,
    data: {
      title: string;
      description?: string;
      link_url?: string;
      image_url?: string;
      price?: number;
      currency?: string;
      position?: number;
    },
    token?: string | null
  ) =>
    request<WishlistItem>(`/wishlists/${wishlistId}/items`, {
      method: "POST",
      body: data,
      token,
    }),
  update: (
    wishlistId: string,
    itemId: string,
    data: Partial<{
      title: string;
      description: string;
      link_url: string;
      image_url: string;
      price: number;
      currency: string;
      position: number;
      reservation_status: "available" | "reserved" | "purchased";
      reservation_message: string;
    }>,
    token?: string | null
  ) =>
    request<WishlistItem>(`/wishlists/${wishlistId}/items/${itemId}`, {
      method: "PATCH",
      body: data,
      token,
    }),
  delete: (wishlistId: string, itemId: string, token?: string | null) =>
    request<void>(`/wishlists/${wishlistId}/items/${itemId}`, {
      method: "DELETE",
      token,
    }),
  getContributions: (wishlistId: string, itemId: string, token?: string | null) =>
    request<import("@/types").ItemContributionsResponse>(
      `/wishlists/${wishlistId}/items/${itemId}/contributions`,
      { token }
    ),
  addContribution: (
    wishlistId: string,
    itemId: string,
    amount: number,
    status?: "pledged" | "paid",
    token?: string | null
  ) =>
    request<WishlistItem>(`/wishlists/${wishlistId}/items/${itemId}/contributions`, {
      method: "POST",
      body: { amount, status: status ?? "pledged" },
      token,
    }),
};

// Link metadata (autocomplete by URL)
export interface LinkMetadata {
  title: string | null;
  image_url: string | null;
  price: number | null;
}

export const metadataApi = {
  get: (url: string, token?: string | null) =>
    request<LinkMetadata>(`/metadata?url=${encodeURIComponent(url)}`, { token }),
};

// Shares
export const shareApi = {
  list: (wishlistId: string, token?: string | null) =>
    request<Share[]>(`/wishlists/${wishlistId}/shares`, { token }),
  create: (wishlistId: string, email: string, role: "viewer" | "editor", token?: string | null) =>
    request<Share>(`/wishlists/${wishlistId}/shares`, {
      method: "POST",
      body: { email, role },
      token,
    }),
  remove: (wishlistId: string, userId: string, token?: string | null) =>
    request<void>(`/wishlists/${wishlistId}/shares/${userId}`, { method: "DELETE", token }),
};

// Public link
export const publicLinkApi = {
  getByToken: (token: string) =>
    request<PublicWishlistResponse>(`/public/wishlists?token=${encodeURIComponent(token)}`),
  create: (wishlistId: string, body?: { expires_at?: string; max_views?: number }, token?: string | null) =>
    request<PublicLink>(`/wishlists/${wishlistId}/public-link`, {
      method: "POST",
      body: body ?? {},
      token,
    }),
  get: (wishlistId: string, token?: string | null) =>
    request<PublicLink | null>(`/wishlists/${wishlistId}/public-link`, { token }),
  revoke: (wishlistId: string, token?: string | null) =>
    request<void>(`/wishlists/${wishlistId}/public-link`, { method: "DELETE", token }),
};

// Public link item actions (reserve / chip-in when viewing list via shared link; requires auth)
export const publicItemApi = {
  updateItem: (
    publicToken: string,
    itemId: string,
    body: { reservation_status: "available" | "reserved" | "purchased"; reservation_message?: string },
    token?: string | null
  ) =>
    request<WishlistItem>(
      `/public/wishlists/items/${itemId}?token=${encodeURIComponent(publicToken)}`,
      { method: "PATCH", body, token }
    ),
  addContribution: (
    publicToken: string,
    itemId: string,
    amount: number,
    status?: "pledged" | "paid",
    token?: string | null
  ) =>
    request<WishlistItem>(
      `/public/wishlists/items/${itemId}/contributions?token=${encodeURIComponent(publicToken)}`,
      { method: "POST", body: { amount, status: status ?? "pledged" }, token }
    ),
};

// Public: suggest item to wishlist owner (anonymous ok)
export const publicSuggestionApi = {
  create: (
    publicToken: string,
    body: { title: string; link_url?: string | null; message?: string | null },
    token?: string | null
  ) =>
    request<WishlistSuggestion>(
      `/public/wishlists/suggestions?token=${encodeURIComponent(publicToken)}`,
      { method: "POST", body, token }
    ),
};

// Notifications
export const notificationsApi = {
  list: (token?: string | null) => request<Notification[]>("/notifications", { token }),
  markRead: (id: string, token?: string | null) =>
    request<void>(`/notifications/${id}/read`, { method: "PATCH", token }),
  markAllRead: (token?: string | null) =>
    request<void>("/notifications/read-all", { method: "POST", token }),
};
