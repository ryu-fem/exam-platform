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
 * Real statistics drawn from the user's quiz attempts:
 * - completedQuizzes: count of finished quizzes
 * - averageScore: average percentage across attempts
 * - totalXp: completedQuizzes * 10 + averageScore * 2 (0 when no quizzes)
 * - bestSubject: subject with the highest average score
 */
export async function getUserStats(userId: string): Promise<StudentStats> {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId },
    select: {
      score: true,
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

  const totalXp = completedQuizzes > 0 ? completedQuizzes * 10 + averageScore * 2 : 0;
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