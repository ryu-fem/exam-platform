import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BookOpenText } from "lucide-react";

import { StudentNavbar } from "@/components/StudentNavbar";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import type { Locale } from "@/lib/locale";
import { isLocale } from "@/lib/locale";
import { getSubjectLabel } from "@/lib/quiz-data";
import { getQuizzesForUser } from "@/lib/quizzes";
import { requireStudentUser } from "@/lib/require-student";

const DIFFICULTY_VARIANT = {
  easy: "success",
  medium: "warning",
  hard: "danger",
} as const;

export default async function QuizzesPage() {
  const user = await requireStudentUser();

  const t = await getTranslations("quizzes");
  const rawLocale = await getLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const quizzes = await getQuizzesForUser(user);

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </header>

        {quizzes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <BookOpenText className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-4 text-sm text-muted">{t("empty")}</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => {
              const difficultyKey =
                quiz.difficulty.charAt(0).toUpperCase() +
                quiz.difficulty.slice(1);
              const variant =
                DIFFICULTY_VARIANT[
                  quiz.difficulty as keyof typeof DIFFICULTY_VARIANT
                ] ?? "neutral";

              return (
                <li key={quiz.id}>
                  <div className="flex h-full flex-col rounded-2xl border border-border bg-surface">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-semibold">
                        {getSubjectLabel(quiz.subject, locale)}
                      </h2>
                      <Badge variant={variant}>
                        {t(`difficulty${difficultyKey}` as "difficultyEasy")}
                      </Badge>
                    </div>

                    <p className="mt-2 text-xs text-muted">
                      {t("questions", { count: quiz.questionCount })} ·{" "}
                      {t("minutes", { count: quiz.durationMins })}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      <span className="text-xs font-medium text-accent">
                        {t("pointsReward", { xp: quiz.xpReward })}
                      </span>
                      <Link
                        href={`/quizzes/${quiz.id}`}
                        className={buttonVariants({
                          variant: "primary",
                          size: "sm",
                        })}
                      >
                        {t("startQuiz")}
                        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                      </Link>
                    </div>
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