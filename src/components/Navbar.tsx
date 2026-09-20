"use client";

import { useTranslations } from "next-intl";
import { GraduationCap } from "lucide-react";

import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Link } from "@/i18n/navigation";

export function Navbar({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md transition-colors duration-200 ease-out">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            {t("appName")}
          </span>
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