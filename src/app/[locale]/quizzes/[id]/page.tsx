import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Clock3, ListChecks } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { StudentNavbar } from "@/components/StudentNavbar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { getSubjectLabel } from "@/lib/quiz-data";
import { requireStudentUser } from "@/lib/require-student";

type Props = {
  params: Promise<{ id: string }>;
};

const DIFFICULTY_VARIANT = {
  easy: "success",
  medium: "warning",
  hard: "danger",
} as const;

export default async function QuizPage({ params }: Props) {
  const user = await requireStudentUser();
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) notFound();

  const t = await getTranslations("quizzes");
  const tc = await getTranslations("common");
  const rawLocale = await getLocale();
  const locale = rawLocale === "ar" ? "ar" : "en";

  const title = getSubjectLabel(quiz.subject, locale);
  const difficultyKey =
    quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1);
  const variant =
    DIFFICULTY_VARIANT[quiz.difficulty as keyof typeof DIFFICULTY_VARIANT] ??
    "neutral";

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/quizzes"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {tc("back")}
        </Link>

        <div className="mt-6">
          <Badge variant={variant}>
            {t(`difficulty${difficultyKey}` as "difficultyEasy")}
          </Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="h-4 w-4" />
              {t("questions", { count: quiz.questionCount })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" />
              {t("minutes", { count: quiz.durationMins })}
            </span>
            <span className="font-medium text-accent">
              {t("pointsReward", { xp: quiz.xpReward })}
            </span>
          </div>
        </div>

        <Card className="mt-8">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-base font-semibold">{tc("comingSoon")}</p>
            <p className="max-w-md text-sm text-muted">
              {locale === "ar"
                ? "منصة الأسئلة لسه بتتجهز. راجع المادة الأول، وهنقولك أول ما الاختبار يفتح."
                : "The quiz engine is being built. Review the subject for now — we'll notify you the moment this quiz goes live."}
            </p>
          </div>
        </Card>
      </main>
    </>
  );
}