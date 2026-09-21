"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("common");
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={t("toggleDarkMode")}
      title={t("toggleDarkMode")}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-8 w-[60px] shrink-0 items-center rounded-full",
        "border border-border bg-surface-muted cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute start-[7px] top-1/2 h-4 w-4 -translate-y-1/2",
          isDark ? "text-muted" : "text-foreground",
        )}
      />
      <Moon
        className={cn(
          "absolute end-[7px] top-1/2 h-4 w-4 -translate-y-1/2",
          isDark ? "text-accent-foreground" : "text-muted",
        )}
      />

      <span
        className={cn(
          "absolute start-[3px] top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full",
          "bg-accent text-accent-foreground shadow-sm transition-all duration-200 ease-in-out",
          isDark
            ? "ltr:translate-x-[30px] rtl:-translate-x-[30px]"
            : "translate-x-0",
        )}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5" />
        ) : (
          <Sun className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}