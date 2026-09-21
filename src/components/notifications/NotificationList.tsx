"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Award, Bell, ShieldCheck } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type Props = {
  items: NotificationItem[];
};

type Filter = "all" | "result" | "account" | "system";

const FILTERS: Filter[] = ["all", "result", "account", "system"];

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupLabelFor(
  key: string,
  today: string,
  yesterday: string,
): "today" | "yesterday" | null {
  if (key === today) return "today";
  if (key === yesterday) return "yesterday";
  return null;
}

// Module-level so Date.now() never runs inside the component render body.
function nowDayKeys(): { today: string; yesterday: string } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    today: localDayKey(today),
    yesterday: localDayKey(yesterday),
  };
}

function timeAgo(
  createdAt: string,
  t: (key: string, values?: Record<string, unknown>) => string,
): string {
  const seconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (seconds < 60) return t("aAgo");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("minAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hourAgo", { count: hours });
  const days = Math.floor(hours / 24);
  return t("dayAgo", { count: days });
}

export function NotificationList({ items }: Props) {
  const t = useTranslations("notifications");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      filter === "all" ? items : items.filter((item) => item.type === filter),
    [items, filter],
  );

  const groups = useMemo(() => {
    const order = [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const map = new Map<string, NotificationItem[]>();
    for (const item of order) {
      const key = localDayKey(new Date(item.createdAt));
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return [...map.entries()];
  }, [filtered]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [locale],
  );

  const { today, yesterday } = nowDayKeys();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ease-in-out",
              filter === f
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface text-muted hover:border-accent/40 hover:text-foreground",
            )}
          >
            {t(`filter${f.charAt(0).toUpperCase()}${f.slice(1)}` as "filterAll")}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-4 text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([dayKey, dayItems]) => {
            const relative = groupLabelFor(dayKey, today, yesterday);
            return (
              <section key={dayKey}>
                <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {relative
                    ? t(relative)
                    : dateFormatter.format(new Date(dayKey + "T00:00:00"))}
                </h2>
                <ul className="space-y-3">
                  {dayItems.map((notification) => {
                    const href = notification.link?.startsWith("/")
                      ? notification.link
                      : null;
                    const classes = cn(
                      "flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all duration-200 ease-in-out",
                      !href
                        ? "cursor-default"
                        : "cursor-pointer hover:border-foreground/40",
                      !notification.isRead && "border-accent/40",
                    );
                    const Icon =
                      notification.type === "result"
                        ? Award
                        : notification.type === "account"
                          ? ShieldCheck
                          : Bell;
                    const content = (
                      <>
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted">
                          <Icon className="h-5 w-5 text-muted" />
                          {!notification.isRead && (
                            <span className="absolute end-0 top-0 h-2.5 w-2.5 rounded-full bg-accent" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">
                            {notification.message}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="text-[11px] text-muted">
                            {timeAgo(
                              notification.createdAt,
                              t as (key: string, values?: Record<string, unknown>) => string,
                            )}
                          </p>
                          {href && (
                            <ArrowRight className="ms-auto mt-1 h-3.5 w-3.5 text-muted rtl:rotate-180" />
                          )}
                        </div>
                      </>
                    );
                    return (
                      <li key={notification.id}>
                        {href ? (
                          <Link href={href} className={classes}>
                            {content}
                          </Link>
                        ) : (
                          <div className={classes}>{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}