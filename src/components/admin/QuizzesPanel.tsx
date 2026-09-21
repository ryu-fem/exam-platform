"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Eye, Pencil, Plus, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ErrorBanner } from "@/components/ui/Alert";
import { QuizEditor } from "@/components/admin/QuizEditor";
import { YEARS } from "@/lib/curriculum";
import { getSubjectLabel } from "@/lib/quiz-data";

type ViewQuestion = {
  type: "mcq";
  text: string;
  options?: string[] | null;
  correctAnswer: string;
  explanation?: string | null;
  points: number;
};

type Quiz = {
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
  questions?: ViewQuestion[];
};

function diffKey(value: string): "diff_easy" | "diff_medium" | "diff_hard" {
  if (value === "easy") return "diff_easy";
  if (value === "hard") return "diff_hard";
  return "diff_medium";
}

export function QuizzesPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [view, setView] = useState<
    { mode: "list" } | { mode: "create" } | { mode: "edit"; id: string }
  >({ mode: "list" });
  const [viewQuiz, setViewQuiz] = useState<Quiz | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/quizzes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("failedToLoadQuizzes"));
      setQuizzes(data.quizzes as Quiz[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToLoadQuizzes"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleDone(message: string) {
    setToast(message);
    setView({ mode: "list" });
    await load();
  }

  async function openView(quiz: Quiz) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/quizzes/${quiz.id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("failedToLoadQuizzes"));
      setViewQuiz(data.quiz as Quiz);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToLoadQuizzes"));
    }
  }

  async function deleteQuiz() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("failedToDelete"));
      setToast(t("quizDeleted"));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToDelete"));
    } finally {
      setBusy(false);
    }
  }

  function yearLabel(value: string, ar: boolean) {
    const y = YEARS.find((item) => item.value === value);
    return y ? (ar ? y.label.ar : y.label.en) : value;
  }

  if (view.mode === "create") {
    return <QuizEditor onDone={handleDone} onCancel={() => setView({ mode: "list" })} />;
  }

  if (view.mode === "edit") {
    return (
      <QuizEditor
        quizId={view.id}
        onDone={handleDone}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("navQuizzes")}</h1>
          <p className="mt-1 text-sm text-muted">{t("quizzesSubtitle")}</p>
        </div>
        <Button onClick={() => setView({ mode: "create" })}>
          <Plus className="h-4 w-4" />
          {t("createQuiz")}
        </Button>
      </header>

      <ErrorBanner>{error}</ErrorBanner>

      <div>
        <h2 className="mb-3 text-base font-semibold">{t("allQuizzes")}</h2>
        {loading ? (
          <Card className="p-6 text-sm text-muted">{t("loading")}</Card>
        ) : quizzes.length === 0 ? (
          <Card className="p-6 text-sm text-muted">{t("noQuizzesYet")}</Card>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{getSubjectLabel(quiz.subject, isAr ? "ar" : "en")}</p>
                    <Badge>{t(diffKey(quiz.difficulty))}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {t("quizMeta", {
                      profile: yearLabel(quiz.year, isAr),
                      questions: quiz.questionCount,
                      minutes: quiz.durationMins,
                      xp: quiz.xpReward,
                      difficulty: t(diffKey(quiz.difficulty)),
                    })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openView(quiz)} aria-label={t("view")}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setView({ mode: "edit", id: quiz.id })}
                    aria-label={t("edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(quiz)}
                    aria-label={t("delete")}
                    className="text-danger hover:bg-danger-muted"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!viewQuiz}
        onClose={() => setViewQuiz(null)}
        title={viewQuiz ? getSubjectLabel(viewQuiz.subject, isAr ? "ar" : "en") : undefined}
      >
        {viewQuiz && (
          <div className="space-y-3">
            {viewQuiz.questions?.map((q, index) => (
              <div key={index} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">
                    {index + 1}. {q.text}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="neutral">{t("mcqBadge")}</Badge>
                    <span className="text-xs text-muted">{t("ptsSuffix", { points: q.points })}</span>
                  </div>
                </div>
                {q.options && (
                  <ul className="mt-2 space-y-1">
                    {q.options.map((opt) => (
                      <li
                        key={opt}
                        className={
                          opt === q.correctAnswer
                            ? "rounded-md bg-success-muted px-2 py-1 text-xs text-success"
                            : "px-2 py-1 text-xs text-muted"
                        }
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                )}
                {q.explanation && (
                  <p className="mt-2 text-xs text-muted">
                    {t("explanationPrefix")} {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t("delete")}>
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {deleteTarget
              ? t("deleteConfirm", { subject: getSubjectLabel(deleteTarget.subject, isAr ? "ar" : "en") })
              : ""}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={deleteQuiz} loading={busy}>
              {t("delete")}
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-4 end-4 z-50 flex items-center gap-2 rounded-lg border border-success/20 bg-success-muted px-4 py-3 text-sm text-success shadow-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
