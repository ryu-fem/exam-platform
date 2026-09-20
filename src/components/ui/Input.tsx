import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className={cn("w-full", className)}>
        <input
          ref={ref}
          aria-invalid={!!error}
          className={cn(
            "w-full h-11 rounded-lg border bg-surface px-3.5 text-sm",
            "placeholder:text-muted",
            "transition-colors duration-200 ease-out",
            "focus:outline-none focus:ring-2 focus:ring-foreground/25",
            "focus:border-foreground/60",
            error ? "border-danger focus:ring-danger/25" : "border-border",
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";