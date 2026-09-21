import {
  ArrowRight,
  CheckCircle2,
  Hourglass,
  XCircle,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { StudentNavbar } from "@/components/StudentNavbar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  type GradingRow,
  parseAnswers,
  parseGrading,
} from "@/lib/quiz-engine";
import { requireStudentUser } from "@/lib/require-student";

type Props = { params: Promise<{ attemptId: string }> };

export default async function ResultPage({ params }: Props) {
  const user = await requireStudentUser();
  const t = await getTranslations("results");
  const { attemptId } = await params;

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!attempt) notFound();
  if (attempt.userId !== user.id && user.role !== "admin") notFound();

  const answers = parseAnswers(attempt.answers);
  const grading = parseGrading(attempt.grading);
  const gradingByQuestion = new Map(
    grading.map((row) => [row.questionId, row]),
  );

  const status = attempt.status;
  const pending = status === "pending";
  const rejected = status === "rejected";

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-muted">
            {attempt.quiz.title}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
            {pending
              ? t("pendingTitle")
              : rejected
                ? t("rejectedTitle")
                : t("approvedTitle")}
          </h1>
        </div>

        {pending && <PendingState tPending={t("pendingMessage")} tHint={t("pendingHint")} />}

        {rejected && (
          <Card className="border-danger/30">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 shrink-0 text-danger" />
              <div>
                <p className="text-sm font-semibold">{t("rejectedNote")}</p>
                {attempt.note && (
                  <p className="mt-1 text-sm text-muted">{attempt.note}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {!pending && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-5 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
                <p className="mt-2 text-3xl font-bold">
                  {attempt.score}
                  <span className="ms-0.5 text-lg text-muted">%</span>
                </p>
                <p className="mt-1 text-xs text-muted">{t("yourScore")}</p>
              </Card>
              <Card className="p-5 text-center">
                <span className="mx-auto flex h-6 w-6 items-center justify-center text-lg">
                  ⚡
                </span>
                <p className="mt-2 text-3xl font-bold">
                  +{attempt.xpEarned}
                </p>
                <p className="mt-1 text-xs text-muted">{t("xpEarned")}</p>
              </Card>
            </div>

            <section className="mt-10">
              <h2 className="text-lg font-bold tracking-tight">
                {t("detailsTitle")}
              </h2>
              <div className="mt-4 space-y-4">
                {attempt.quiz.questions.map((question, index) => {
                  const row = gradingByQuestion.get(question.id);
                  const studentAnswer = answers[question.id] ?? "";
                  const unanswered = !studentAnswer.trim();
                  const showAdminReason =
                    !!row?.reason?.trim() &&
                    row.reason !== "No answer submitted.";

                  return (
                    <Card key={question.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold leading-relaxed">
                          <span className="me-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-surface-muted text-xs text-muted">
                            {index + 1}
                          </span>
                          {question.text}
                        </p>
                        <StatusBadge
                          correct={{ status, row, unanswered }}
                          tCorrect={t("correct")}
                          tIncorrect={t("incorrect")}
                          tReviewing={t("reviewing")}
                        />
                      </div>

                      <div className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        <ReviewRow
                          label={t("yourAnswer")}
                          value={unanswered ? t("noAnswer") : studentAnswer}
                          muted={unanswered}
                        />
                        <ReviewRow
                          label={t("correctAnswer")}
                          value={question.correctAnswer}
                        />
                      </div>

                      {showAdminReason &&
                        row?.reason && (
                          <p className="mt-3 rounded-lg border border-warning/20 bg-warning-muted px-3.5 py-2.5 text-sm text-warning">
                            <strong>{t("reason")}:</strong> {row.reason}
                          </p>
                        )}

                      {question.explanation && (
                        <p className="mt-3 rounded-lg border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-muted">
                          💡 {question.explanation}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <div className="mt-8">
          <Link
            href="/quizzes"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            {t("backToQuizzes")}
          </Link>
        </div>
      </main>
    </>
  );
}

function PendingState({ tPending, tHint }: { tPending: string; tHint: string }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Hourglass className="h-10 w-10 text-muted" />
        <p className="text-base font-semibold">{tPending}</p>
        <p className="max-w-md text-sm text-muted">{tHint}</p>
      </div>
    </Card>
  );
}

function StatusBadge({
  correct,
  tCorrect,
  tIncorrect,
  tReviewing,
}: {
  correct: {
    status: string;
    row: GradingRow | undefined;
    unanswered: boolean;
  };
  tCorrect: string;
  tIncorrect: string;
  tReviewing: string;
}) {
  const { status, row, unanswered } = correct;
  if (status !== "approved") {
    return <Badge variant="warning">{tReviewing}</Badge>;
  }
  if (row?.correct) return <Badge variant="success">{tCorrect}</Badge>;
  if (unanswered) return <Badge variant="neutral">{tIncorrect}</Badge>;
  return <Badge variant="danger">{tIncorrect}</Badge>;
}

function ReviewRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={cn("mt-1 whitespace-pre-wrap text-sm", muted && "text-muted")}>
        {value}
      </p>
    </div>
  );
}