import { BookOpenText } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { StudentNavbar } from "@/components/StudentNavbar";
import { subjectsForProfile } from "@/lib/curriculum";
import { getSubjectLabel } from "@/lib/quiz-data";
import { getQuizzesForUser } from "@/lib/quizzes";
import { requireStudentUser } from "@/lib/require-student";

export default async function QuizzesPage() {
  const user = await requireStudentUser();
  const t = await getTranslations("quizzes");
  const rawLocale = await getLocale();
  const locale = rawLocale === "ar" ? "ar" : "en";

  const profileQuizzes = await getQuizzesForUser({
    year: user.year,
    system: user.system,
    section: user.section,
    track: user.track,
    electiveSubject: user.electiveSubject,
  });

  const subjects = subjectsForProfile({
    year: user.year,
    system: user.system,
    section: user.section,
    track: user.track,
    electiveSubject: user.electiveSubject,
  });

  const countBySubject = new Map<string, number>();
  for (const quiz of profileQuizzes) {
    countBySubject.set(quiz.subject, (countBySubject.get(quiz.subject) ?? 0) + 1);
  }

  const cards = subjects
    .map((key) => ({ key, count: countBySubject.get(key) ?? 0 }))
    .sort((a, b) =>
      getSubjectLabel(a.key, locale).localeCompare(
        getSubjectLabel(b.key, locale),
        locale,
      ),
    );

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("subjectsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("subjectsSubtitle")}</p>
        </header>

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
            <BookOpenText className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-4 text-sm text-muted">{t("empty")}</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map(({ key, count }) => (
              <li key={key}>
                <Link
                  href={`/quizzes/${key}`}
                  className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl card-flat p-4 text-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted transition-colors duration-200 ease-in-out group-hover:bg-accent group-hover:text-accent-foreground">
                    <BookOpenText className="h-6 w-6" />
                  </span>
                  <span className="text-base font-semibold leading-tight">
                    {getSubjectLabel(key, locale)}
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {count === 1
                      ? t("quizCountOne", { count })
                      : t("quizCount", { count })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}