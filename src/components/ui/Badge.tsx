import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "success" | "danger" | "warning";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-muted border border-border",
  success: "bg-success-muted text-success border border-success/20",
  danger: "bg-danger-muted text-danger border border-danger/20",
  warning: "bg-warning-muted text-warning border border-warning/20",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}