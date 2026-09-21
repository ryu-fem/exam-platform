import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, ...props }, ref) => {
    return (
      <div className={cn("w-full", className)}>
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "w-full h-11 appearance-none rounded-lg border bg-surface px-3.5 pe-9 text-sm cursor-pointer",
              "transition-all duration-200 ease-in-out",
              "focus:outline-none focus:ring-2 focus:ring-foreground/25",
              "focus:border-foreground/60",
              error ? "border-danger" : "border-border",
            )}
            {...props}
          >
            {placeholder !== undefined && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";