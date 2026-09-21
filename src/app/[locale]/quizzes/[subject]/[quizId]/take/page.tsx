import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { StudentNavbar } from "@/components/StudentNavbar";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { prisma } from "@/lib/prisma";
import { requireStudentUser } from "@/lib/require-student";
import type { SafeQuestion } from "@/lib/quiz-engine";

type Props = {
  params: Promise<{ subject: string; quizId: string }>;
};

export default async function TakeQuizPage({ params }: Props) {
  const user = await requireStudentUser();
  const locale = await getLocale();
  const { subject, quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!quiz || quiz.subject !== subject) notFound();

  const existing = await prisma.quizAttempt.findFirst({
    where: { userId: user.id, quizId: quiz.id },
    select: { id: true },
  });
  if (existing) redirect({ href: `/results/${existing.id}`, locale });

  if (quiz.questions.length === 0)
    redirect({ href: `/quizzes/${subject}/${quiz.id}`, locale });

  const questions: SafeQuestion[] = quiz.questions.map(
    ({ id, text, options, points, order }) => ({
      id,
      type: "mcq",
      text,
      options: Array.isArray(options)
        ? (options as string[]).filter((o) => o.length > 0)
        : null,
      points,
      order,
    }),
  );

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />
      <QuizRunner
        quizId={quiz.id}
        quizTitle={quiz.title}
        subjectKey={quiz.subject}
        durationMins={quiz.durationMins}
        questions={questions}
      />
    </>
  );
}