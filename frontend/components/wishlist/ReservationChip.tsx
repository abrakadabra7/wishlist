"use client";

import { useLanguage } from "@/contexts/LanguageContext";

type Status = "available" | "reserved" | "purchased";

const styles: Record<Status, string> = {
  available: "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300 theme-transition",
  reserved: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 theme-transition",
  purchased: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 theme-transition",
};

export default function ReservationChip({ status }: { status: Status }) {
  const { t } = useLanguage();
  const label = t(`reservation.${status}`);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {label}
    </span>
  );
}
