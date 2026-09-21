import { getLocale, getTranslations } from "next-intl/server";
import type { ComponentProps, ReactNode } from "react";

import { StudentNavbar } from "@/components/StudentNavbar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import { Trophy } from "lucide-react";
import { requireStudentUser } from "@/lib/require-student";
import { prisma } from "@/lib/prisma";
import { systemLabel, yearLabel } from "@/lib/labels";

type Props = {
  searchParams: Promise<{
    period?: string;
    year?: string;
    system?: string;
  }>;
};

const PERIODS = ["week", "month", "all"] as const;
const YEARS = ["all", "1", "2", "3"] as const;
const SYSTEMS = ["all", "general", "azhar", "baccalaureate"] as const;

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function cutoffFor(period: string): Date | undefined {
  const now = Date.now();
  if (period === "week") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (period === "month") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return undefined;
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: ComponentProps<typeof Link>["href"];
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ease-in-out ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-surface text-muted hover:border-accent/40 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function FilterGroup({
  label,
  items,
}: {
  label: string;
  items: {
    key: string;
    href: ComponentProps<typeof Link>["href"];
    active: boolean;
    label: string;
  }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {items.map((item) => (
        <FilterChip key={item.key} href={item.href} active={item.active}>
          {item.label}
        </FilterChip>
      ))}
    </div>
  );
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const user = await requireStudentUser();
  const t = await getTranslations("leaderboard");
  const rawLocale = await getLocale();
  const isAr = rawLocale === "ar";
  const locale = isAr ? "ar" : "en";

  const { period, year, system } = await searchParams;
  const activePeriod = (PERIODS as readonly string[]).includes(period ?? "")
    ? (period as string)
    : "month";
  const activeYear = (YEARS as readonly string[]).includes(year ?? "")
    ? (year as string)
    : "all";
  const activeSystem = (SYSTEMS as readonly string[]).includes(system ?? "")
    ? (system as string)
    : "all";

  const since = cutoffFor(activePeriod);

  const tops = await prisma.quizAttempt.groupBy({
    by: ["userId"],
    where: {
      status: "approved",
      ...(since ? { submittedAt: { gte: since } } : {}),
      ...(activeYear !== "all" ? { user: { year: activeYear } } : {}),
      ...(activeSystem !== "all" ? { user: { system: activeSystem } } : {}),
    },
    _sum: { xpEarned: true },
    orderBy: { _sum: { xpEarned: "desc" } },
    take: 50,
  });

  let rows: { id: string; name: string; username: string; xp: number }[] = [];
  if (tops.length > 0) {
    const userIds = tops.map((row) => row.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, status: "active" },
      select: { id: true, name: true, username: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    rows = tops
      .map((row) => ({
        id: row.userId,
        name: byId.get(row.userId)?.name ?? "?",
        username: byId.get(row.userId)?.username ?? "",
        xp: row._sum.xpEarned ?? 0,
      }))
      .filter((row) => row.xp > 0);
  }

  const meId = user.id;

  const makeHref = (over: { period?: string; year?: string; system?: string }) => ({
    pathname: "/leaderboard",
    query: {
      ...(over.period ? { period: over.period } : {}),
      ...(over.year ? { year: over.year } : {}),
      ...(over.system ? { system: over.system } : {}),
    },
  });

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
              <p className="mt-0.5 text-sm text-muted">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-2.5 rounded-2xl card-flat p-4">
          <FilterGroup
            label={t("periodLabel")}
            items={PERIODS.map((p) => ({
              key: p,
              href: makeHref({ period: p }),
              active: activePeriod === p,
              label: t(`period${p.charAt(0).toUpperCase()}${p.slice(1)}` as "periodWeek"),
            }))}
          />
          <FilterGroup
            label={t("yearLabel")}
            items={YEARS.map((y) => ({
              key: y,
              href: makeHref({ year: y }),
              active: activeYear === y,
              label: y === "all" ? t("yearAll") : yearLabel(y, locale) || y,
            }))}
          />
          <FilterGroup
            label={t("systemLabel")}
            items={SYSTEMS.map((s) => ({
              key: s,
              href: makeHref({ system: s }),
              active: activeSystem === s,
              label: s === "all" ? t("systemAll") : systemLabel(s, locale) || s,
            }))}
          />
        </div>

        {rows.length === 0 ? (
          <Card>
            <div className="flex items-center justify-center gap-2 py-6 text-center">
              <p className="text-sm text-muted">{t("scoringNote")}</p>
            </div>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rows.map((row, index) => {
              const isMe = row.id === meId;
              const medal = index < 3 ? MEDALS[index] : null;
              return (
                <li key={row.id}>
                  <div className={`rounded-2xl card-flat p-4 ${isMe ? "ring-1 ring-accent/40" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
                          medal
                            ? "bg-accent text-accent-foreground"
                            : "bg-surface-muted text-muted"
                        }`}
                      >
                        {medal ?? index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">
                            {row.name}
                          </span>
                          {isMe && (
                            <Badge className="shrink-0">{t("you")}</Badge>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          @{row.username}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="text-sm font-bold text-accent">
                          {row.xp.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted">{t("points")}</p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}