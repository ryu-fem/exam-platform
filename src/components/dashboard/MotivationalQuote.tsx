"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Quote, Sparkles } from "lucide-react";

type State =
  | { status: "loading" }
  | { status: "done"; quote: string }
  | { status: "error" };

export function MotivationalQuote() {
  const t = useTranslations("dashboard");
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/motivational-quote", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("quote request failed");
        return res.json() as Promise<{ quote?: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.quote) throw new Error("empty quote");
        setState({ status: "done", quote: data.quote });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute -end-6 -top-8 select-none"
      >
        <Quote className="h-32 w-32 -scale-x-100 text-surface-muted" />
      </div>

      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          {t("quoteTitle")}
        </span>

        {state.status === "loading" && (
          <div className="mt-5 animate-pulse space-y-3" aria-hidden>
            <div className="h-6 w-11/12 rounded bg-surface-muted sm:h-7" />
            <div className="h-6 w-8/12 rounded bg-surface-muted sm:h-7" />
          </div>
        )}

        {state.status === "done" && (
          <blockquote>
            <p
              dir="rtl"
              className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed sm:text-xl lg:text-2xl"
            >
              {state.quote}
            </p>
          </blockquote>
        )}

        {state.status === "error" && (
          <p className="mt-5 max-w-3xl text-base text-muted">{t("aiError")}</p>
        )}
      </div>
    </section>
  );
}