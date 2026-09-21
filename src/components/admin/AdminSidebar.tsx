"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  CheckSquare,
  FileQuestion,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";

import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", key: "navOverview", icon: LayoutDashboard },
  { href: "/admin/students", key: "navStudents", icon: Users },
  { href: "/admin/requests", key: "navRequests", icon: Inbox },
  { href: "/admin/quizzes", key: "navQuizzes", icon: FileQuestion },
  { href: "/admin/grading", key: "navGrading", icon: CheckSquare },
  { href: "/admin/notifications", key: "navNotifications", icon: Bell },
  { href: "/admin/admins", key: "navAdmins", icon: ShieldCheck },
] as const;

export function AdminSidebar() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  const close = () => setOpen(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  const nav = (
    <nav className="px-3">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out",
                  active
                    ? "bg-surface-muted text-foreground"
                    : "text-muted hover:bg-surface-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const footer = (
    <div className="mt-auto space-y-4 border-t border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-all duration-200 ease-in-out hover:border-border-strong hover:bg-surface-muted"
      >
        <LogOut className="h-4 w-4" />
        {tc("logout")}
      </button>
    </div>
  );

  const brand = (
    <Link
      href="/admin"
      onClick={close}
      className="flex items-center gap-2.5 px-4 py-4"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="text-base font-semibold tracking-tight">
        {tc("appName")}
      </span>
    </Link>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[260px] flex-col border-e border-border bg-background lg:flex">
        <div className="border-b border-border">{brand}</div>
        <div className="flex-1 overflow-y-auto py-3">{nav}</div>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background px-4 lg:hidden">
        <Link href="/admin" onClick={close} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            {tc("appName")}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <button
            type="button"
            aria-expanded={open}
            aria-label={t("openMenu")}
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-foreground transition-all duration-200 ease-in-out hover:bg-surface-muted"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          type="button"
          aria-label={t("closeMenu")}
          onClick={close}
          className={cn(
            "absolute inset-0 h-full w-full cursor-pointer bg-foreground/20 transition-opacity duration-200 ease-in-out",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "absolute inset-y-0 start-0 flex w-[260px] flex-col bg-background transition-transform duration-200 ease-in-out",
            open
              ? "translate-x-0 rtl:translate-x-0"
              : "-translate-x-full rtl:translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-border">
            {brand}
            <button
              type="button"
              aria-label={t("closeMenu")}
              onClick={close}
              className="me-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-foreground transition-all duration-200 ease-in-out hover:bg-surface-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-3">{nav}</div>
          {footer}
        </aside>
      </div>
    </>
  );
}