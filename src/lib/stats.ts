import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type StudentStats = {
  completedQuizzes: number;
  averageScore: number; // percentage, 0-100
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpToNext: number;
  bestSubject: string | null; // subject key, null if no data
};

/**
 * Real statistics drawn from the user's quiz attempts (approved only):
 * - completedQuizzes: count of approved quizzes
 * - averageScore: average percentage across approved attempts
 * - totalXp: sum of xpEarned across approved attempts
 * - bestSubject: subject with the highest average score
 */
async function computeUserStats(userId: string): Promise<StudentStats> {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId, status: "approved" },
    select: {
      score: true,
      xpEarned: true,
      quiz: { select: { subject: true } },
    },
  });

  const completedQuizzes = attempts.length;
  const averageScore =
    completedQuizzes > 0
      ? Math.round(
          attempts.reduce((sum, attempt) => sum + attempt.score, 0) /
            completedQuizzes,
        )
      : 0;

  const totalXp =
    completedQuizzes > 0
      ? attempts.reduce((sum, attempt) => sum + attempt.xpEarned, 0)
      : 0;
  const level = Math.floor(totalXp / 100) + 1;
  const xpIntoLevel = totalXp % 100;

  let bestSubject: string | null = null;
  if (completedQuizzes > 0) {
    const totals = new Map<string, { sum: number; count: number }>();
    for (const attempt of attempts) {
      const entry = totals.get(attempt.quiz.subject) ?? { sum: 0, count: 0 };
      entry.sum += attempt.score;
      entry.count += 1;
      totals.set(attempt.quiz.subject, entry);
    }

    let bestAverage = -1;
    for (const [subject, entry] of totals) {
      const average = entry.sum / entry.count;
      if (average > bestAverage) {
        bestAverage = average;
        bestSubject = subject;
      }
    }
  }

  return {
    completedQuizzes,
    averageScore,
    totalXp,
    level,
    xpIntoLevel,
    xpToNext: 100,
    bestSubject,
  };
}

/**
 * Stats are memoized per user for 60s. This keeps the dashboard
 * (and `/api/stats`) cheap without serving stale numbers for long.
 */
export function getUserStats(userId: string): Promise<StudentStats> {
  return unstable_cache(
    async () => computeUserStats(userId),
    [`user-stats-${userId}`],
    { revalidate: 60 },
  )();
}