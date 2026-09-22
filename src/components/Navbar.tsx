"use client";

import { useTranslations } from "next-intl";

import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Link } from "@/i18n/navigation";

export function Navbar({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background transition-colors duration-200 ease-out">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Logo text={t("appName")} />
        </Link>

        <div className="flex items-center gap-3">
          {children}
          <LanguageToggle className="hidden sm:inline-flex" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}