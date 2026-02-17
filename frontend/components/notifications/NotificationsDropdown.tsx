"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { notificationsApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Notification } from "@/types";

function formatNotificationTime(isoString: string, locale: string, yesterdayLabel: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.getDate() === d.getDate() && yesterday.getMonth() === d.getMonth() && yesterday.getFullYear() === d.getFullYear();
  const timeStr = d.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return timeStr;
  if (isYesterday) return `${yesterdayLabel}, ${timeStr}`;
  return d.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsDropdown() {
  const [list, setList] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t, locale } = useLanguage();
  const formatTime = useMemo(
    () => (iso: string) => formatNotificationTime(iso, locale, t("nav.yesterday")),
    [locale, t]
  );

  const translatedNotification = useMemo(() => {
    const kinds: Record<string, { titleKey: string; bodyKey: string }> = {
      wishlist_deleted: { titleKey: "notifications.wishlist_deleted.title", bodyKey: "notifications.wishlist_deleted.body" },
      item_removed: { titleKey: "notifications.item_removed.title", bodyKey: "notifications.item_removed.body" },
      item_removed_pledged: { titleKey: "notifications.item_removed_pledged.title", bodyKey: "notifications.item_removed_pledged.body" },
      refund_paid: { titleKey: "notifications.refund_paid.title", bodyKey: "notifications.refund_paid.body" },
      wishlist_suggestion: { titleKey: "notifications.wishlist_suggestion.title", bodyKey: "notifications.wishlist_suggestion.body" },
    };
    return (n: Notification): { title: string; body: string } => {
      const keys = kinds[n.kind];
      if (!keys) return { title: n.title, body: n.body };
      const payload = n.payload ?? {};
      const formatPayload = "amount" in payload && typeof payload.amount === "number"
        ? { ...payload, amount: payload.amount.toFixed(2) }
        : payload;
      try {
        const title = t(keys.titleKey, formatPayload as Record<string, string>);
        const body = t(keys.bodyKey, formatPayload as Record<string, string>);
        if (title && body) return { title, body };
      } catch {
        // ignore
      }
      return { title: n.title, body: n.body };
    };
  }, [t]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      notificationsApi
        .list()
        .then(setList)
        .finally(() => setLoading(false));
    }
  }, [open]);

  useEffect(() => {
    const handler = () => {
      notificationsApi.list().then(setList);
    };
    window.addEventListener("notifications-refresh", handler);
    return () => window.removeEventListener("notifications-refresh", handler);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  const unreadCount = list.filter((n) => !n.read_at).length;

  function handleMarkAllRead() {
    notificationsApi.markAllRead().then(() => {
      setList((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    });
  }

  function handleMarkRead(id: string) {
    notificationsApi.markRead(id).then(() => {
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors theme-transition"
        aria-label={t("nav.notifications")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[calc(100vw-2rem)] max-w-80 sm:max-w-80 max-h-[70vh] overflow-auto bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-600 py-2 z-50 theme-transition">
          <div className="flex items-center justify-between px-3 pb-2 border-b border-surface-100 dark:border-surface-700">
            <span className="font-medium text-surface-900 dark:text-surface-100">{t("nav.notifications")}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                {t("nav.markAllRead")}
              </button>
            )}
          </div>
          {loading ? (
            <p className="px-3 py-4 text-sm text-surface-500 dark:text-surface-300">{t("nav.loading")}</p>
          ) : list.length === 0 ? (
            <p className="px-3 py-4 text-sm text-surface-500 dark:text-surface-300">{t("nav.noNotifications")}</p>
          ) : (
            <ul className="divide-y divide-surface-100 dark:divide-surface-700">
              {list.map((n) => {
                const { title, body } = translatedNotification(n);
                return (
                <li key={n.id} className={`px-3 py-2.5 ${!n.read_at ? "bg-brand-50/50 dark:bg-brand-950/40" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{title}</p>
                      <p className="text-xs text-surface-600 dark:text-surface-300 mt-0.5">{body}</p>
                      {n.created_at && (
                        <p className="text-xs text-surface-400 dark:text-surface-400 mt-1" title={new Date(n.created_at).toLocaleString()}>
                          {formatTime(n.created_at)}
                        </p>
                      )}
                    </div>
                    {!n.read_at && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        className="shrink-0 text-xs text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        {t("nav.read")}
                      </button>
                    )}
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
