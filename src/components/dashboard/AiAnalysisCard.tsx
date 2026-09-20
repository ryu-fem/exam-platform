"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw, Sparkles, Target, Zap } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { StudentStats } from "@/lib/stats";

export type LevelProfile = {
  name: string;
  year?: string | null;
  system?: string | null;
  track?: string | null;
  electiveSubject?: string | null;
};

type Props = {
  stats: StudentStats;
  bestSubjectLabel: string | null;
  profile: LevelProfile;
};

export function AiAnalysisCard({ stats, bestSubjectLabel, profile }: Props) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const runAnalysis = useCallback(async () => {
    const res = await fetch("/api/ai/performance-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale,
        name: profile.name,
        year: profile.year,
        system: profile.system,
        track: profile.track,
        electiveSubject: profile.electiveSubject,
        completedQuizzes: stats.completedQuizzes,
        averageScore: stats.averageScore,
        xp: stats.totalXp,
        level: stats.level,
        bestSubject: bestSubjectLabel,
      }),
    });
    if (!res.ok) throw new Error("analysis request failed");

    const data = (await res.json()) as { analysis?: string };
    if (!data.analysis) throw new Error("empty analysis");
    return data.analysis;
  }, [stats, profile, locale, bestSubjectLabel]);

  useEffect(() => {
    if (stats.completedQuizzes === 0) return;
    let cancelled = false;
    runAnalysis()
      .then((analysis) => {
        if (cancelled) return;
        setAnalysis(analysis);
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [runAnalysis, stats.completedQuizzes]);

  const handleRegenerate = () => {
    setStatus("loading");
    setAnalysis(null);
    runAnalysis()
      .then((analysis) => {
        setAnalysis(analysis);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  };

  const remainder = Math.max(0, stats.xpToNext - stats.xpIntoLevel);
  const progress = Math.min(
    100,
    Math.round((stats.xpIntoLevel / stats.xpToNext) * 100),
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {t("aiAnalysisTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{t("aiSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="gap-1">
            <Sparkles className="h-3 w-3 text-accent" />
            AI
          </Badge>
          {stats.completedQuizzes > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              loading={status === "loading"}
              disabled={status === "loading"}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("regenerate")}
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Zap className="h-3.5 w-3.5 text-accent" />
            {t("xpLabel")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">
            {stats.totalXp}
          </p>
        </div>
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Target className="h-3.5 w-3.5 text-accent" />
            {t("levelLabel")}
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight">{stats.level}</p>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-4 h-1.5 max-w-[180px] overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("progressToNext", { xp: remainder })}
          </p>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-7">
        {stats.completedQuizzes === 0 ? (
          <p className="max-w-3xl text-sm text-muted">{t("noDataYet")}</p>
        ) : status === "loading" ? (
          <>
            <span className="sr-only">{t("analyzing")}</span>
            <div className="animate-pulse space-y-3" aria-hidden>
              <div className="h-4 w-11/12 rounded bg-surface-muted" />
              <div className="h-4 w-10/12 rounded bg-surface-muted" />
              <div className="h-4 w-8/12 rounded bg-surface-muted" />
            </div>
          </>
        ) : analysis ? (
          <p className="max-w-4xl text-base leading-relaxed">{analysis}</p>
        ) : (
          <p className="max-w-3xl text-sm text-muted">{t("aiError")}</p>
        )}
      </div>
    </section>
  );
}