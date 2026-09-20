import { getTranslations } from "next-intl/server";
import { BarChart3, CheckCircle2, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { StudentStats } from "@/lib/stats";

type Props = {
  stats: StudentStats;
  bestSubjectLabel: string | null;
};

export async function StatsCards({ stats, bestSubjectLabel }: Props) {
  const t = await getTranslations("dashboard");

  const items: {
    label: string;
    value: string;
    Icon: LucideIcon;
  }[] = [
    {
      label: t("completedQuizzes"),
      value: String(stats.completedQuizzes),
      Icon: CheckCircle2,
    },
    {
      label: t("averageScore"),
      value: `${stats.averageScore}%`,
      Icon: BarChart3,
    },
    {
      label: t("bestSubject"),
      value: bestSubjectLabel ?? t("noBestSubject"),
      Icon: Star,
    },
  ];

  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map(({ label, value, Icon }) => (
        <div
          key={label}
          className="rounded-2xl border border-border bg-surface p-6"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
              <Icon className="h-4 w-4 text-foreground" />
            </span>
            <dt className="text-xs font-medium text-muted">{label}</dt>
          </div>
          <dd className="mt-5 truncate text-3xl font-bold tracking-tight">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}