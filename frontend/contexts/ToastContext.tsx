"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let id = 0;
function nextId() {
  return String(++id);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const toast: Toast = { id: nextId(), type, message };
    setToasts((prev) => [...prev.slice(-4), toast]);
    const tid = toast.id;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== tid));
    }, 4000);
  }, []);

  const removeToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  const value: ToastContextValue = { toasts, addToast, removeToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastList />
    </ToastContext.Provider>
  );
}

function ToastList() {
  const { toasts, removeToast } = useContext(ToastContext)!;
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-4 sm:max-w-sm"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`
            pointer-events-auto rounded-xl border px-4 py-3 shadow-lg
            flex items-center justify-between gap-3
            ${
              t.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                : t.type === "error"
                  ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
                  : "bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-600 text-surface-900 dark:text-surface-100"
            }
          `}
        >
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="shrink-0 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 p-1 -m-1 rounded"
            aria-label="Dismiss"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
