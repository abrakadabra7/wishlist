"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-200 ${className}`}
      aria-hidden
    />
  );
}

export function ListCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-surface-200/80 p-6 shadow-card">
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2 mt-2" />
    </div>
  );
}

export function ListDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
