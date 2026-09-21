import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type LandingStats = {
  totalStudents: number;
  totalQuizzes: number;
  topStudent: {
    name: string;
    avatarUrl: string | null;
    track: string | null;
    totalXp: number;
  } | null;
};

async function computeLandingStats(): Promise<LandingStats> {
  const [totalStudents, totalQuizzes, topByXp] = await Promise.all([
    prisma.user.count({ where: { role: "student", status: "active" } }),
    prisma.quiz.count(),
    prisma.quizAttempt.groupBy({
      by: ["userId"],
      where: { status: "approved" },
      _sum: { xpEarned: true },
      orderBy: { _sum: { xpEarned: "desc" } },
      take: 1,
    }),
  ]);

  let topStudent: LandingStats["topStudent"] = null;
  const leader = topByXp[0];
  if (leader) {
    const user = await prisma.user.findUnique({
      where: { id: leader.userId },
      select: { name: true, avatarUrl: true, track: true },
    });
    if (user) {
      topStudent = {
        name: user.name,
        avatarUrl: user.avatarUrl,
        track: user.track,
        totalXp: leader._sum.xpEarned ?? 0,
      };
    }
  }

  return { totalStudents, totalQuizzes, topStudent };
}

/**
 * Public landing-page stats, revalidated hourly.
 */
export const getLandingStats = unstable_cache(
  async () => computeLandingStats(),
  ["landing-stats"],
  { revalidate: 3600 },
);