import { prisma } from "@/lib/prisma";

export type AdminActivity = {
  id: string;
  kind: "student" | "attempt" | "request";
  title: string;
  subtitle: string;
  createdAt: string;
};

export type AdminOverview = {
  totalStudents: number;
  pendingStudents: number;
  pendingRequests: number;
  totalQuizzes: number;
  pendingAttempts: number;
  weekly: { date: string; count: number }[];
  activity: AdminActivity[];
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);

  const [
    totalStudents,
    pendingStudents,
    pendingVerifications,
    pendingChanges,
    totalQuizzes,
    pendingAttempts,
    weekAttempts,
    recentUsers,
    recentAttempts,
    recentRequests,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "student", status: "active" } }),
    prisma.user.count({ where: { role: "student", status: "pending" } }),
    prisma.verification.count({ where: { status: "pending" } }),
    prisma.accountChangeRequest.count({ where: { status: "pending" } }),
    prisma.quiz.count(),
    prisma.quizAttempt.count({ where: { status: "pending" } }),
    prisma.quizAttempt.findMany({
      where: { submittedAt: { gte: weekStart } },
      select: { submittedAt: true },
    }),
    prisma.user.findMany({
      where: { role: "student" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, username: true, createdAt: true },
    }),
    prisma.quizAttempt.findMany({
      orderBy: { submittedAt: "desc" },
      take: 6,
      select: {
        id: true,
        submittedAt: true,
        score: true,
        user: { select: { name: true } },
        quiz: { select: { title: true } },
      },
    }),
    prisma.accountChangeRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        field: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const buckets = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    buckets.set(dayKey(d), 0);
  }
  for (const attempt of weekAttempts) {
    const key = dayKey(attempt.submittedAt);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const activity: AdminActivity[] = [
    ...recentUsers.map((u) => ({
      id: `user-${u.id}`,
      kind: "student" as const,
      title: u.name,
      subtitle: `@${u.username}`,
      createdAt: u.createdAt.toISOString(),
    })),
    ...recentAttempts.map((a) => ({
      id: `attempt-${a.id}`,
      kind: "attempt" as const,
      title: a.user?.name ?? "—",
      subtitle: `${a.quiz?.title ?? "—"} · ${a.score}%`,
      createdAt: a.submittedAt.toISOString(),
    })),
    ...recentRequests.map((r) => ({
      id: `request-${r.id}`,
      kind: "request" as const,
      title: r.user?.name ?? "—",
      subtitle: r.field,
      createdAt: r.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  return {
    totalStudents,
    pendingStudents,
    pendingRequests: pendingVerifications + pendingChanges,
    totalQuizzes,
    pendingAttempts,
    weekly: [...buckets.entries()].map(([date, count]) => ({ date, count })),
    activity,
  };
}