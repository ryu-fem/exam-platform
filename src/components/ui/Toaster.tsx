"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { TOAST_EVENT } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TOAST_DURATION_MS = 3500;

/**
 * Minimal, dependency-free toast host. Any module can call `showToast(msg)`
 * (see src/lib/toast.ts) and the message appears as a floating pill.
 */
export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setMessage(detail);
      window.setTimeout(() => setMessage(null), TOAST_DURATION_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4"
    >
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3",
          "shadow-xl shadow-black/10 dark:shadow-black/40",
          "max-w-md text-sm font-medium text-foreground",
        )}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        <span>{message}</span>
      </div>
    </div>
  );
}