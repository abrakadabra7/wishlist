import { WS_URL } from "./constants";
import { getAccessToken } from "./auth";

export type WsEvent =
  | { event: "subscribed"; wishlist_id: string; public?: boolean }
  | { event: "item_added"; item: Record<string, unknown> }
  | { event: "item_updated"; item: Record<string, unknown> }
  | { event: "item_removed"; item_id: string }
  | { event: "suggestion_added"; suggestion: Record<string, unknown> }
  | { event: "suggestion_removed"; suggestion_id: string }
  | { event: "error"; code: string; message: string }
  | { event: "authenticated"; user_id: string }
  | { event: "ping"; ts?: number };

export function buildWsUrl(options: {
  accessToken?: string | null;
  publicToken?: string | null;
}): string {
  const params = new URLSearchParams();
  if (options.accessToken) params.set("access_token", options.accessToken);
  if (options.publicToken) params.set("public_token", options.publicToken);
  const q = params.toString();
  return q ? `${WS_URL}?${q}` : WS_URL;
}

export function createWsConnection(
  url: string,
  onMessage: (data: WsEvent) => void,
  onClose?: () => void
): WebSocket {
  const ws = new WebSocket(url);
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as WsEvent;
      onMessage(data);
    } catch {}
  };
  ws.onclose = () => onClose?.();
  return ws;
}

export function sendSubscribe(ws: WebSocket, wishlistId: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: "subscribe", wishlist_id: wishlistId }));
  }
}

export function sendAuth(ws: WebSocket, accessToken: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: "auth", access_token: accessToken }));
  }
}
