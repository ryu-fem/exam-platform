import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "danger";

const config = {
  info: { icon: Info, classes: "bg-surface-muted text-foreground border-border" },
  success: { icon: CheckCircle2, classes: "bg-success-muted text-success border-success/20" },
  danger: { icon: AlertCircle, classes: "bg-danger-muted text-danger border-danger/20" },
};

export function Alert({
  children,
  variant = "info",
  className,
}: {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
}) {
  const { icon: Icon, classes } = config[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        classes,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function ErrorBanner({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-muted px-3.5 py-3 text-sm text-danger">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}