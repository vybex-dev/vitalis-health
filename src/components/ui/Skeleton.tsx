import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/** Shimmer skeleton base */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-porcelain-2 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/** A row of skeleton text lines */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Full card skeleton */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="size-9 rounded-lg shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

/** Stat card skeleton (for dashboard) */
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)]">
      <Skeleton className="mb-3 size-9 rounded-lg" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-7 w-24 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

/** Table row skeleton */
export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-border last:border-b-0">
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  );
}

/** Chart area skeleton */
export function SkeletonChart({ height = 256 }: { height?: number }) {
  return (
    <Skeleton className={`w-full rounded-xl`} style={{ height }} />
  );
}
