"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { WishlistItem } from "@/types";
import {
  buildWsUrl,
  sendSubscribe,
  type WsEvent,
} from "@/lib/websocket";
import { getAccessToken } from "@/lib/auth";

const MAX_RECONNECT_DELAY_MS = 30000;
const INITIAL_RECONNECT_DELAY_MS = 1000;

export function useRealtimeList(
  wishlistId: string | null,
  items: WishlistItem[],
  setItems: (items: WishlistItem[] | ((prev: WishlistItem[]) => WishlistItem[])) => void,
  options: {
    usePublicToken?: string | null;
    onSuggestionAdded?: () => void;
    onSuggestionRemoved?: (suggestionId: string) => void;
  } = {}
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const hadConnectedRef = useRef(false);
  const setItemsRef = useRef(setItems);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const onSuggestionAddedRef = useRef(options.onSuggestionAdded);
  const onSuggestionRemovedRef = useRef(options.onSuggestionRemoved);
  setItemsRef.current = setItems;
  onSuggestionAddedRef.current = options.onSuggestionAdded;
  onSuggestionRemovedRef.current = options.onSuggestionRemoved;

  const applyEvent = useCallback((ev: WsEvent) => {
    if (ev.event === "ping") return;
    if (ev.event === "item_added" && ev.item) {
      const newItem = ev.item as unknown as WishlistItem;
      setItemsRef.current((prev) =>
        prev.some((i) => i.id === newItem.id) ? prev : [...prev, newItem]
      );
    } else if (ev.event === "item_updated" && ev.item) {
      const updated = ev.item as unknown as WishlistItem;
      setItemsRef.current((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
    } else if (ev.event === "item_removed" && ev.item_id) {
      setItemsRef.current((prev) => prev.filter((i) => i.id !== ev.item_id));
    } else if (ev.event === "suggestion_added") {
      onSuggestionAddedRef.current?.();
    } else if (ev.event === "suggestion_removed" && ev.suggestion_id) {
      onSuggestionRemovedRef.current?.(ev.suggestion_id);
    }
  }, []);

  useEffect(() => {
    if (!wishlistId) return;

    const wid = wishlistId;
    const publicToken = options.usePublicToken ?? null;
    const accessToken = publicToken ? null : getAccessToken();
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const url = buildWsUrl({
        accessToken: accessToken || undefined,
        publicToken: publicToken || undefined,
      });
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as WsEvent;
          if (data.event === "ping") {
            try {
              ws.send(JSON.stringify({ event: "pong" }));
            } catch {}
            return;
          }
          if (data.event === "subscribed") {
            hadConnectedRef.current = true;
            setConnected(true);
            setReconnecting(false);
          } else applyEvent(data);
        } catch {}
      };

      ws.onopen = () => {
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
        if (publicToken) {
          hadConnectedRef.current = true;
          setConnected(true);
          setReconnecting(false);
        } else {
          sendSubscribe(ws, wid);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (hadConnectedRef.current) setReconnecting(true);
        wsRef.current = null;
        if (cancelled) return;
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(
          delay * 2,
          MAX_RECONNECT_DELAY_MS
        );
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    };
  }, [wishlistId, options.usePublicToken, applyEvent]);

  return { connected, reconnecting };
}
