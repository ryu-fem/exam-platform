"use client";

import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { locale: "en", label: "EN" },
  { locale: "ar", label: "AR" },
] as const;

type OptionLocale = (typeof OPTIONS)[number]["locale"];

function LanguageToggleInner({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("navbar");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAr = locale === "ar";

  const switchTo = (next: OptionLocale) => {
    if (next === locale) return;

    const query = searchParams.toString();
    const href = query
      ? {
          pathname,
          query: Object.fromEntries(searchParams.entries()),
        }
      : pathname;

    router.replace(href, { locale: next, scroll: false });
  };

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "relative inline-flex h-8 w-[5.25rem] items-center rounded-full border border-border bg-surface-muted p-1",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute start-1 top-1 h-6 w-9 rounded-full bg-accent shadow-sm transition-transform duration-200 ease-out",
          isAr ? "translate-x-full rtl:-translate-x-full" : "translate-x-0",
        )}
      />
      {OPTIONS.map((option) => {
        const active = locale === option.locale;
        return (
          <button
            key={option.locale}
            type="button"
            aria-pressed={active}
            aria-label={
              option.locale === "en" ? t("languageToEn") : t("languageToAr")
            }
            onClick={() => switchTo(option.locale)}
            className={cn(
              "relative z-10 h-6 flex-1 rounded-full text-xs font-semibold transition-colors duration-200",
              active
                ? "text-accent-foreground"
                : "cursor-pointer text-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function LanguageToggle({ className }: { className?: string }) {
  return (
    <Suspense
      fallback={
        <div
          className={cn(
            "inline-flex h-8 w-[5.25rem] items-center justify-center rounded-full border border-border bg-surface-muted text-xs font-semibold text-muted",
            className,
          )}
        >
          EN
        </div>
      }
    >
      <LanguageToggleInner className={className} />
    </Suspense>
  );
}