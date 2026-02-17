"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import type { WishlistWithProgress } from "@/types";
import Card from "@/components/ui/Card";

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function ListCard({
  list,
  showSharedBadge = false,
  isOwner = false,
  onDelete,
}: {
  list: WishlistWithProgress;
  showSharedBadge?: boolean;
  isOwner?: boolean;
  onDelete?: (id: string) => void;
}) {
  const { t } = useLanguage();
  const total = list.items_count || 0;
  const done = list.purchased_count || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const borderClass =
    pct >= 100 ? "border-l-emerald-500" : pct > 0 ? "border-l-amber-500" : "border-l-surface-200";
  const dueStr = formatDueDate(list.due_date);

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete) return;
    onDelete(list.id);
  }

  return (
    <div className="h-full">
      <Link href={`/lists/${list.id}`} className="block h-full">
        <Card
          className={`block relative overflow-hidden hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-full border-l-4 ${borderClass}`}
          padding="md"
        >
          <div className="pointer-events-none absolute inset-x-0 -top-10 h-20 bg-gradient-to-br from-brand-50/60 via-transparent to-amber-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 min-h-[2.25rem] relative">
            <div className="flex items-center gap-2 min-w-0 flex-1 order-1 sm:order-none">
              <div className="h-8 w-8 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-sm text-brand-500 dark:text-brand-400 shrink-0 theme-transition">
                🎁
              </div>
              <h2 className="font-semibold text-surface-900 dark:text-surface-100 truncate theme-transition">{list.title}</h2>
            </div>
            {isOwner ? (
              <div className="flex items-center gap-1.5 shrink-0 order-2 sm:order-none" onClick={(e) => e.stopPropagation()}>
                <Link
                  href={`/lists/${list.id}/edit`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-surface-600 dark:text-surface-300 hover:text-brand-600 dark:hover:text-brand-400 bg-surface-100 dark:bg-surface-700 hover:bg-brand-50 dark:hover:bg-brand-950/50 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap theme-transition"
                >
                  {t("common.edit")}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(e);
                  }}
                  className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  {t("common.delete")}
                </button>
              </div>
            ) : showSharedBadge ? (
              <span className="shrink-0 text-xs font-medium text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded-full order-2 sm:order-none theme-transition">
                {t("lists.shared")}
              </span>
            ) : null}
          </div>
          {list.description && (
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400 line-clamp-2 theme-transition">
              {list.description}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-1.5">
            {total > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-surface-200 dark:bg-surface-600 overflow-hidden theme-transition">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-surface-300"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-surface-600 dark:text-surface-300 tabular-nums theme-transition">
                  {done}/{total}
                </span>
              </div>
            )}
            {dueStr && (
              <p className="text-xs text-surface-500 dark:text-surface-400 theme-transition">
                {t("lists.due")}: {dueStr}
              </p>
            )}
          </div>
        </Card>
      </Link>
    </div>
  );
}
