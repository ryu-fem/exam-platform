"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";

type Result = { ok: boolean; unread?: number };

export function NotificationBell({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useTranslations("navbar");
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const json = (await res.json()) as Result;
        if (!cancelled) {
          setUnread(json.unread ?? 0);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }

    void load();
    const reloadTimer = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(reloadTimer);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={t("notifications")}
      title={t("notifications")}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-all duration-200 ease-in-out hover:text-foreground ${className ?? ""}`}
    >
      <Bell className="h-4 w-4" />
      {loaded && unread > 0 && pathname !== "/notifications" && (
        <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}