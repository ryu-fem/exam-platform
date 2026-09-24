import {
  ArrowRight,
  Ban,
  Clock3,
  Eye,
  ListChecks,
  Sparkles,
  Zap,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { StudentNavbar } from "@/components/StudentNavbar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { QuizStartButton } from "@/components/quiz/QuizStartButton";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { getSubjectLabel } from "@/lib/quiz-data";
import { prisma } from "@/lib/prisma";
import { requireStudentUser } from "@/lib/require-student";

type Props = { params: Promise<{ subject: string; quizId: string }> };

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export default async function QuizConfirmPage({ params }: Props) {
  const user = await requireStudentUser();
  const t = await getTranslations("quizzes");
  const tc = await getTranslations("common");
  const rawLocale = await getLocale();
  const locale = rawLocale === "ar" ? "ar" : "en";
  const { subject, quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { _count: { select: { questions: true } } },
  });
  if (!quiz || quiz.subject !== subject) notFound();

  const existing = await prisma.quizAttempt.findFirst({
    where: { userId: user.id, quizId: quiz.id },
    orderBy: { submittedAt: "desc" },
    select: { id: true, status: true },
  });

  const difficultyKey =
    quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1);
  const variant = DIFFICULTY_VARIANT[quiz.difficulty] ?? "success";

  const warnings = [
    {
      icon: Sparkles,
      text: t("warnAI"),
    },
    {
      icon: Ban,
      text: t("warnCheat"),
    },
    {
      icon: Eye,
      text: t("warnTracking"),
    },
  ];

  const canStart = quiz._count.questions > 0 && !existing;

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href={`/quizzes/${subject}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-all duration-200 ease-in-out hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          {tc("back")}
        </Link>

        <Card className="mt-6">
          <div className="flex flex-col items-start gap-4">
            <Badge variant={variant}>
              {t(`difficulty${difficultyKey}` as "difficultyEasy")}
            </Badge>
            <div>
              <p className="text-xs font-medium text-muted">
                {getSubjectLabel(quiz.subject, locale)}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                {quiz.title}
              </h1>
            </div>

            <div className="grid w-full grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-center">
                <ListChecks className="mx-auto h-4 w-4 text-muted" />
                <p className="mt-1.5 text-sm font-semibold">
                  {quiz._count.questions}
                </p>
                <p className="text-[11px] text-muted">{t("questionsLabel")}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-center">
                <Clock3 className="mx-auto h-4 w-4 text-muted" />
                <p className="mt-1.5 text-sm font-semibold">
                  {quiz.durationMins}
                </p>
                <p className="text-[11px] text-muted">{t("minutesLabel")}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-center">
                <Zap className="mx-auto h-4 w-4 text-muted" />
                <p className="mt-1.5 text-sm font-semibold">{quiz.xpReward}</p>
                <p className="text-[11px] text-muted">{tc("xp")}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <h2 className="text-sm font-semibold text-foreground">
            {t("warningsTitle")}
          </h2>
          <ul className="mt-3 space-y-2.5">
            {warnings.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted px-3.5 py-2.5 text-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted" />
                <span className="font-medium">{text}</span>
              </li>
            ))}
          </ul>

          {quiz._count.questions === 0 && (
            <p className="mt-4 rounded-lg border border-warning/20 bg-warning-muted px-3.5 py-2.5 text-sm text-warning">
              {t("quizNoQuestions")}
            </p>
          )}
        </Card>

        {existing && (
          <Link
            href={`/results/${existing.id}`}
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "mt-6 w-full",
            )}
          >
            {existing.status === "pending"
              ? t("alreadyPending")
              : t("alreadyApproved")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        )}

        {canStart && (
          <QuizStartButton
            subject={subject}
            quizId={quiz.id}
            isPending={user.status === "pending"}
          />
        )}
      </main>
    </>
  );
}