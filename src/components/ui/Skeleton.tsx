import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

/** Minimal pulsing placeholder used inside Suspense fallbacks. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
    />
  );
}