import { getLocale, getTranslations } from "next-intl/server";
import { Users, ClipboardList, FileText, GraduationCap } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAdminOverview } from "@/lib/admin-stats";

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const overview = await getAdminOverview();

  const maxWeek = Math.max(1, ...overview.weekly.map((d) => d.count));

  const stats = [
    { key: "students", value: overview.totalStudents, sub: `${overview.pendingStudents} ${t("statPending")}`, Icon: Users },
    { key: "requests", value: overview.pendingRequests, sub: t("statAwaiting"), Icon: ClipboardList },
    { key: "quizzes", value: overview.totalQuizzes, sub: t("statPublished"), Icon: FileText },
    { key: "grading", value: overview.pendingAttempts, sub: t("statToGrade"), Icon: GraduationCap },
  ] as const;

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });

  const kindVariant = {
    student: "neutral",
    attempt: "success",
    request: "warning",
  } as const;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("navOverview")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ key, value, sub, Icon }) => (
          <Card key={key} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{t(`stat_${key}`)}</span>
              <Icon className="h-4 w-4 text-muted" />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted">{sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">{t("weeklyActivity")}</h2>
          <div className="mt-6 flex h-40 items-end justify-between gap-2">
            {overview.weekly.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium text-muted">{day.count}</span>
                <div
                  className="w-full rounded-t-md bg-foreground/80 transition-all duration-200 ease-in-out"
                  style={{ height: `${Math.max(4, (day.count / maxWeek) * 100)}%` }}
                  title={`${day.date}: ${day.count}`}
                />
                <span className="text-[11px] text-muted">
                  {dayFmt.format(new Date(`${day.date}T00:00:00Z`))}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">{t("recentActivity")}</h2>
          {overview.activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("noActivity")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {overview.activity.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted">{item.subtitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={kindVariant[item.kind]}>{t(`activity_${item.kind}`)}</Badge>
                    <span className="hidden text-[11px] text-muted sm:inline">
                      {dateFmt.format(new Date(item.createdAt))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}