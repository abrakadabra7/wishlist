"use client";

export interface ProgressProps {
  value: number;
  max: number;
  /** When set with pledged, show segmented bar: paid (green), pledged (amber), remaining (grey). */
  paid?: number;
  pledged?: number;
  paidLabel?: string;
  pledgedLabel?: string;
  label?: string;
  showCount?: boolean;
  className?: string;
}

export default function Progress({
  value,
  max,
  paid = 0,
  pledged = 0,
  paidLabel = "Paid",
  pledgedLabel = "Pledged",
  label,
  showCount = true,
  className = "",
}: ProgressProps) {
  const hasSegments = max > 0 && (paid > 0 || pledged > 0);
  const paidPct = max > 0 ? Math.min(100, (paid / max) * 100) : 0;
  const pledgedPct = max > 0 ? Math.min(100 - paidPct, ((pledged ?? 0) / max) * 100) : 0;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className={className}>
      {(label || showCount) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && (
            <span className="text-sm font-medium text-surface-600 dark:text-surface-300 theme-transition">{label}</span>
          )}
          {showCount && (
            <span className="text-sm text-surface-500 dark:text-surface-400 theme-transition">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="h-2.5 w-full rounded-full bg-surface-200 dark:bg-surface-600 overflow-hidden flex theme-transition">
        {hasSegments ? (
          <>
            {paidPct > 0 && (
              <div
                className={`h-full bg-emerald-500 transition-all duration-300 ease-out rounded-l-full ${pledgedPct <= 0 ? "rounded-r-full" : ""}`}
                style={{ width: `${paidPct}%` }}
                title="Paid"
              />
            )}
            {pledgedPct > 0 && (
              <div
                className={`h-full bg-amber-500 transition-all duration-300 ease-out ${paidPct <= 0 ? "rounded-l-full" : ""} rounded-r-full`}
                style={{ width: `${pledgedPct}%` }}
                title="Pledged"
              />
            )}
          </>
        ) : (
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      {hasSegments && (paid > 0 || pledged > 0) && (
        <div className="flex gap-3 mt-1 text-xs text-surface-500 dark:text-surface-400 theme-transition">
          {paid > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {paidLabel}
            </span>
          )}
          {pledged > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {pledgedLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
