import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { StudentNavbar } from "@/components/StudentNavbar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  electiveLabel,
  systemLabel,
  trackLabel,
  yearLabel,
} from "@/lib/labels";
import type { Locale } from "@/lib/locale";
import { isLocale } from "@/lib/locale";
import { getSubjectLabel } from "@/lib/quiz-data";
import { requireStudentUser } from "@/lib/require-student";
import { getUserStats } from "@/lib/stats";
import { getTelegramProfilePhoto } from "@/lib/telegram";

// Lazy-loaded client chunks: the AI card and the quote only fetch data after
// hydration (they render skeletons until then), so they never block first paint.
const LazyAiAnalysisCard = dynamic(() =>
  import("@/components/dashboard/AiAnalysisCard").then((m) => m.AiAnalysisCard),
);
const LazyMotivationalQuote = dynamic(() =>
  import("@/components/dashboard/MotivationalQuote").then((m) => m.MotivationalQuote),
);
// The stats section is server-computed (cached for 60s) but deferred to its own
// chunk with a skeleton fallback so the header paints immediately.
const LazyStatsCards = dynamic(() =>
  import("@/components/dashboard/StatsCards").then((m) => m.StatsCards),
);

function cardSkeleton(children: ReactNode) {
  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-6">
      {children}
    </div>
  );
}

function SkeletonQuote() {
  return cardSkeleton(
    <div className="space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>,
  );
}

function SkeletonStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-surface p-5">
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return cardSkeleton(
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>,
  );
}

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

  const yearLabelStr = user.year ? yearLabel(user.year, locale) : null;
  const systemLabelStr = user.system ? systemLabel(user.system, locale) : null;
  const trackLabelStr = user.track ? trackLabel(user.track, locale) : null;
  const electiveLabelStr = user.electiveSubject
    ? electiveLabel(user.electiveSubject, locale)
    : null;
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
            {yearLabelStr && <Badge variant="neutral">{yearLabelStr}</Badge>}
            {systemLabelStr && <Badge variant="neutral">{systemLabelStr}</Badge>}
            {trackLabelStr && <Badge variant="neutral">{trackLabelStr}</Badge>}
            {electiveLabelStr && <Badge variant="neutral">{electiveLabelStr}</Badge>}
            <Badge variant="neutral">
              {tc("level")} {stats.level}
            </Badge>
          </div>
        </header>

        <div className="mt-10">
          <Suspense fallback={<SkeletonQuote />}>
            <LazyMotivationalQuote />
          </Suspense>
        </div>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold tracking-tight">{t("statsTitle")}</h2>
            <p className="mt-0.5 text-sm text-muted">{t("statsSubtitle")}</p>
          </div>
          <Suspense fallback={<SkeletonStats />}>
            <LazyStatsCards stats={stats} bestSubjectLabel={bestSubjectLabel} />
          </Suspense>
        </section>

        <section className="mt-10">
          <Suspense fallback={<SkeletonCard />}>
            <LazyAiAnalysisCard
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
          </Suspense>
        </section>
      </main>
    </>
  );
}