import { getTranslations } from "next-intl/server";

import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { StudentNavbar } from "@/components/StudentNavbar";
import { Card } from "@/components/ui/Card";
import { YEAR_LABELS, SYSTEM_LABELS } from "@/lib/constants";
import { requireStudentUser } from "@/lib/require-student";

export default async function SettingsPage() {
  const user = await requireStudentUser();
  const t = await getTranslations("settings");

  const yearLabel = user.year ? YEAR_LABELS[user.year] ?? "-" : "-";
  const systemLabel = user.system ? SYSTEM_LABELS[user.system] : "-";

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
              {t("profileSection")}
            </h2>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
                <dt className="text-xs text-muted">Name</dt>
                <dd className="mt-0.5 font-medium">{user.name}</dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
                <dt className="text-xs text-muted">Username</dt>
                <dd className="mt-0.5 font-medium">@{user.username}</dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
                <dt className="text-xs text-muted">Grade / Year</dt>
                <dd className="mt-0.5 font-medium">{yearLabel}</dd>
              </div>
              <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
                <dt className="text-xs text-muted">System</dt>
                <dd className="mt-0.5 font-medium">{systemLabel}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
              {t("langPref")}
            </h2>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">
                  <LanguageToggle />
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">
                  <ThemeToggle />
                </span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}