"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-14 px-4 text-center ${className}`}
    >
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-surface-100 to-brand-50 dark:from-surface-700 dark:to-brand-950/50 flex items-center justify-center text-4xl mb-5 shadow-card border border-surface-200/40 dark:border-surface-600/40 theme-transition">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-surface-900 dark:text-surface-100 tracking-tight theme-transition">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-surface-500 dark:text-surface-400 max-w-sm leading-relaxed theme-transition">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
