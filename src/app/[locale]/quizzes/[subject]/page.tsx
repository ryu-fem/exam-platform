import { ArrowRight, Clock3, ListChecks } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { StudentNavbar } from "@/components/StudentNavbar";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { getSubjectLabel } from "@/lib/quiz-data";
import { getQuizzesForSubject } from "@/lib/quizzes";
import { requireStudentUser } from "@/lib/require-student";

type Props = {
  params: Promise<{ subject: string }>;
};

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
};

export default async function SubjectQuizzesPage({ params }: Props) {
  const user = await requireStudentUser();
  const tc = await getTranslations("common");
  const t = await getTranslations("quizzes");
  const rawLocale = await getLocale();
  const locale = rawLocale === "ar" ? "ar" : "en";
  const { subject } = await params;

  const subjectLabel = getSubjectLabel(subject, locale);
  if (!subjectLabel || subjectLabel === subject) {
    // Unknown subject key -> treat as a valid-enough key but let the empty
    // state render naturally; only 404 for non-subject-looking slugs.
    if (!/^[a-z_]+$/.test(subject)) notFound();
  }

  const quizzes = await getQuizzesForSubject(subject, {
    year: user.year,
    system: user.system,
    section: user.section,
    track: user.track,
    electiveSubject: user.electiveSubject,
  });

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/quizzes"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-all duration-200 ease-in-out hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          {tc("back")}
        </Link>

        <header className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {getSubjectLabel(subject, locale)}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </header>

        {quizzes.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <p className="text-sm text-muted">{t("noQuizzesForSubject")}</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {quizzes.map((quiz) => {
              const difficultyKey =
                quiz.difficulty.charAt(0).toUpperCase() +
                quiz.difficulty.slice(1);
              const variant = DIFFICULTY_VARIANT[quiz.difficulty] ?? "success";

              return (
                <li key={quiz.id}>
                  <div className="flex flex-col gap-4 rounded-2xl card-flat p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">
                          {quiz.title}
                        </h2>
                        <Badge variant={variant}>
                          {t(
                            `difficulty${difficultyKey}` as "difficultyEasy",
                          )}
                        </Badge>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <ListChecks className="h-3.5 w-3.5" />
                          {t("questions", { count: quiz.questionCount })}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {t("minutes", { count: quiz.durationMins })}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-accent">
                          {t("pointsReward", { xp: quiz.xpReward })}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/quizzes/${subject}/${quiz.id}`}
                      className={buttonVariants({
                        variant: "primary",
                        size: "sm",
                      }) + " shrink-0 self-start sm:self-auto"}
                    >
                      {t("enterQuiz")}
                      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </Link>
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