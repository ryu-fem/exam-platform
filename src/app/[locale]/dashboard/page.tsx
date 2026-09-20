import { getLocale, getTranslations } from "next-intl/server";

import { AiAnalysisCard } from "@/components/dashboard/AiAnalysisCard";
import { MotivationalQuote } from "@/components/dashboard/MotivationalQuote";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { StudentNavbar } from "@/components/StudentNavbar";
import { Badge } from "@/components/ui/Badge";
import { SYSTEM_LABELS, TRACK_LABELS, YEAR_LABELS } from "@/lib/constants";
import type { Locale } from "@/lib/locale";
import { isLocale } from "@/lib/locale";
import { getSubjectLabel } from "@/lib/quiz-data";
import { requireStudentUser } from "@/lib/require-student";
import { getUserStats } from "@/lib/stats";
import { getTelegramProfilePhoto } from "@/lib/telegram";

export default async function DashboardPage() {
  const user = await requireStudentUser();

  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const rawLocale = await getLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const [stats, photoUrl] = await Promise.all([
    getUserStats(user.id),
    user.role !== "admin" && user.telegramId
      ? getTelegramProfilePhoto(user.telegramId)
      : Promise.resolve(null),
  ]);

  const yearLabel = user.year ? YEAR_LABELS[user.year] ?? user.year : null;
  const systemLabel = user.system ? SYSTEM_LABELS[user.system] : null;
  const trackLabel = user.track ? TRACK_LABELS[user.track] : null;
  const bestSubjectLabel = stats.bestSubject
    ? getSubjectLabel(stats.bestSubject, locale)
    : null;

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username, photoUrl }} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:py-12">
        <header>
          <p className="text-sm font-medium text-muted">{t("welcomeBack")}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("greeting", { name: user.name })}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">{t("tagline")}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {yearLabel && <Badge variant="neutral">{yearLabel}</Badge>}
            {systemLabel && <Badge variant="neutral">{systemLabel}</Badge>}
            {trackLabel && <Badge variant="neutral">{trackLabel}</Badge>}
            <Badge variant="neutral">
              {tc("level")} {stats.level}
            </Badge>
          </div>
        </header>

        <div className="mt-10">
          <MotivationalQuote />
        </div>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold tracking-tight">{t("statsTitle")}</h2>
            <p className="mt-0.5 text-sm text-muted">{t("statsSubtitle")}</p>
          </div>
          <StatsCards stats={stats} bestSubjectLabel={bestSubjectLabel} />
        </section>

        <section className="mt-10">
          <AiAnalysisCard
            stats={stats}
            bestSubjectLabel={bestSubjectLabel}
            profile={{
              name: user.name,
              year: user.year,
              system: user.system,
              track: user.track,
              electiveSubject: user.electiveSubject,
            }}
          />
        </section>
      </main>
    </>
  );
}