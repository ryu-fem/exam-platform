import { prisma } from "@/lib/prisma";

export type QuizFilterUser = {
  year?: string | null;
  system?: string | null;
  track?: string | null;
  electiveSubject?: string | null;
};

/** Quizzes relevant to the student's year/system/track/elective, from the DB. */
export async function getQuizzesForUser(user: QuizFilterUser) {
  const all = await prisma.quiz.findMany({ orderBy: [{ year: "asc" }, { subject: "asc" }] });

  return all.filter((quiz) => {
    if (user.year && quiz.year !== user.year) return false;
    if (quiz.system && quiz.system !== user.system) return false;
    if (quiz.track && quiz.track !== user.track) return false;
    if (quiz.elective && quiz.elective !== user.electiveSubject) return false;
    return true;
  });
}