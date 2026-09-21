import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type QuizFilterUser = {
  year?: string | null;
  system?: string | null;
  section?: string | null;
  track?: string | null;
  electiveSubject?: string | null;
};

export type PublicQuiz = {
  id: string;
  subject: string;
  title: string;
  year: string;
  system: string | null;
  section: string | null;
  track: string | null;
  elective: string | null;
  questionCount: number;
  durationMins: number;
  xpReward: number;
  difficulty: string;
};

/**
 * Full quiz catalog, cached for 5 minutes. Quizzes are infrequently edited
 * (only by the admin), so re-computing them on every request is wasteful.
 * Quizzes without questions are excluded — they are not playable yet.
 */
const getCachedQuizCatalog = unstable_cache(
  async (): Promise<PublicQuiz[]> => {
    const rows = await prisma.quiz.findMany({
      orderBy: [{ year: "asc" }, { subject: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { questions: true } } },
    });
    return rows.filter((quiz) => quiz._count.questions > 0);
  },
  ["quiz-catalog"],
  { revalidate: 300 },
);

/** Quizzes targeting the student's year/system/section/track/elective profile. */
export async function getQuizzesForUser(user: QuizFilterUser) {
  const all = await getCachedQuizCatalog();

  return all.filter((quiz) => {
    if (user.year && quiz.year !== user.year) return false;
    if (quiz.system && quiz.system !== user.system) return false;
    if (quiz.section && quiz.section !== user.section) return false;
    if (quiz.track && quiz.track !== user.track) return false;
    if (quiz.elective && quiz.elective !== user.electiveSubject) return false;
    return true;
  });
}

/** Quizzes for a single subject, scoped to the student's profile. */
export async function getQuizzesForSubject(
  subject: string,
  user: QuizFilterUser,
) {
  const quizzes = await getQuizzesForUser(user);
  return quizzes.filter((quiz) => quiz.subject === subject);
}