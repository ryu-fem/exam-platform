"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap, LogOut, Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";

import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type StudentNavbarUser = {
  name: string;
  username?: string;
  photoUrl?: string | null;
};

const NAV_LINKS = [
  { href: "/dashboard", key: "home" },
  { href: "/quizzes", key: "availableQuizzes" },
  { href: "/leaderboard", key: "leaderboard" },
  { href: "/settings", key: "accountSettings" },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function StudentNavbar({ user }: { user: StudentNavbarUser }) {
  const t = useTranslations("navbar");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/quizzes") return pathname.startsWith("/quizzes");
    return pathname === href;
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  const avatar = (
    <Link
      href="/settings"
      title={t("profile")}
      className="block h-8 w-8 overflow-hidden rounded-full border border-border bg-surface-muted"
    >
      {user.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.photoUrl}
          alt={user.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-foreground">
          {initials(user.name)}
        </span>
      )}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md transition-colors duration-200 ease-out">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            {tc("appName")}
          </span>
        </Link>

        <nav
          aria-label="Main"
          className="hidden flex-1 items-center justify-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-surface-muted text-foreground"
                  : "text-muted hover:bg-surface-muted/60 hover:text-foreground",
              )}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <LanguageToggle className="hidden sm:inline-flex" />
          <ThemeToggle className="hidden lg:inline-flex" />
          {avatar}
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border text-foreground md:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title={tc("logout")}
            aria-label={tc("logout")}
            className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-foreground md:flex"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          aria-label="Mobile"
          className="border-t border-border bg-background md:hidden"
        >
          <div className="flex flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-surface-muted text-foreground"
                    : "text-muted hover:bg-surface-muted/60 hover:text-foreground",
                )}
              >
                {t(link.key)}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-3">
              <div className="flex items-center gap-3">
                <LanguageToggle />
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
              >
                <LogOut className="h-3.5 w-3.5" />
                {tc("logout")}
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}