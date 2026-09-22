"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock3, Flag, LayoutGrid, ListChecks, Send } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { SafeQuestion } from "@/lib/quiz-engine";
import { getSubjectLabel } from "@/lib/quiz-data";
import { cn } from "@/lib/utils";

type Props = {
  quizId: string;
  quizTitle: string;
  subjectKey: string;
  durationMins: number;
  questions: SafeQuestion[];
};

const STORAGE_PREFIX = "quiz-runner:";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function QuizRunner({
  quizId,
  quizTitle,
  subjectKey,
  durationMins,
  questions,
}: Props) {
  const t = useTranslations("quizzes");
  const locale = useLocale() as "en" | "ar";
  const router = useRouter();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(durationMins * 60);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const submittedRef = useRef(false);
  const restoredRef = useRef(false);

  const storageKey = `${STORAGE_PREFIX}${quizId}`;

  const answersRef = useRef(answers);
  const flaggedRef = useRef(flagged);

  useEffect(() => {
    answersRef.current = answers;
    flaggedRef.current = flagged;
  });

  const questionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const answeredCount = useMemo(
    () =>
      questions.filter(
        (q) => (answers[q.id] ?? "").trim().length > 0,
      ).length,
    [questions, answers],
  );

  const flaggedCount = useMemo(
    () => questions.filter((q) => flagged[q.id]).length,
    [questions, flagged],
  );

  const unanswered = questions.length - answeredCount;

  const setAnswer = useCallback((id: string, value: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (value.trim()) next[id] = value;
      else delete next[id];
      return next;
    });
  }, []);

  const toggleFlag = useCallback((id: string) => {
    setFlagged((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const scrollToQuestion = useCallback((index: number) => {
    questionRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setNavigatorOpen(false);
  }, []);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quizzes/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          answers: Object.fromEntries(
            Object.entries(answers).filter(([, value]) => value.trim()),
          ),
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        attemptId?: string;
        error?: string;
      };
      if (json.ok && json.attemptId) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* ignore storage errors */
        }
        router.push(`/results/${json.attemptId}`);
        return;
      }
      // Failed to save — allow the student to retry the submission.
      submittedRef.current = false;
      if (json.error?.includes("already")) {
        router.push("/quizzes");
        return;
      }
      setTimeUp(false);
    } catch {
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
      setTimeUp(false);
    }
  }, [quizId, answers, router, storageKey]);

  // Countdown timer. Auto-submits when time runs out.
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          clearInterval(timer);
          setTimeUp(true);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeUp && !submittedRef.current && !submitting) {
      void doSubmit();
    }
  }, [timeUp, submitting, doSubmit]);

  // Restore a saved session once, then auto-save progress every 30s.
  useEffect(() => {
    let flashTimer: number | undefined;

    if (!restoredRef.current) {
      restoredRef.current = true;
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as {
            answers?: Record<string, string>;
            flagged?: Record<string, boolean>;
          };
          // Defer the state update out of the effect body to avoid the
          // cascading-render warning; the 30s auto-save below still picks
          // up restored answers via the refs.
          window.setTimeout(() => {
            if (saved.answers) setAnswers(saved.answers);
            if (saved.flagged) setFlagged(saved.flagged);
          }, 0);
        }
      } catch {
        /* ignore corrupted storage */
      }
    }

    const persist = () => {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            answers: answersRef.current,
            flagged: flaggedRef.current,
          }),
        );
        setSavedFlash(true);
        window.clearTimeout(flashTimer);
        flashTimer = window.setTimeout(() => setSavedFlash(false), 1800);
      } catch {
        /* ignore storage write errors */
      }
    };

    const interval = window.setInterval(persist, 30000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(flashTimer);
    };
  }, [storageKey]);

  // Warn before leaving the page with an unsaved quiz in progress.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const timeDanger = secondsLeft < 60;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background transition-colors duration-200 ease-out">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{quizTitle}</p>
            <p className="truncate text-xs text-muted">
              {getSubjectLabel(subjectKey, locale)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={savedFlash ? "success" : "neutral"}>
              {t("progressSaved")}
            </Badge>
            <Badge variant={timeDanger ? "danger" : "neutral"}>
              <Clock3 className="h-3.5 w-3.5" />
              {formatTime(secondsLeft)}
            </Badge>
            <Badge variant="neutral">
              <ListChecks className="h-3.5 w-3.5" />
              {t("answeredCount", { answered: answeredCount, total: questions.length })}
            </Badge>
            <Button
              size="sm"
              loading={submitting}
              disabled={timeUp}
              onClick={() => setConfirmOpen(true)}
            >
              <Send className="h-3.5 w-3.5" />
              {t("submit")}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setNavigatorOpen((open) => !open)}
            aria-expanded={navigatorOpen}
          >
            <LayoutGrid className="h-4 w-4" />
            {t("navigatorTitle")}
            {flaggedCount > 0 && (
              <Badge variant="warning"><Flag className="h-3 w-3" />{flaggedCount}</Badge>
            )}
          </Button>
        </div>

        {navigatorOpen && (
          <div className="mt-4 rounded-2xl card-flat p-4">
            <div className="grid grid-cols-8 gap-2 sm:grid-cols-10 md:grid-cols-12">
              {questions.map((question, index) => {
                const isAnswered = (answers[question.id] ?? "").trim().length > 0;
                const isFlagged = !!flagged[question.id];
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => scrollToQuestion(index)}
                    aria-label={`${t("navigatorTitle")} ${index + 1}`}
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-lg border text-sm font-semibold transition-all duration-200 ease-in-out",
                      isAnswered
                        ? "border-accent/50 bg-accent/10 text-accent"
                        : "border-border bg-surface-muted text-muted hover:text-foreground",
                    )}
                  >
                    {index + 1}
                    {isFlagged && (
                      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ol className="mt-6 space-y-5">
          {questions.map((question, index) => {
            const selected = answers[question.id] ?? "";
            const isFlagged = !!flagged[question.id];
            return (
              <li
                key={question.id}
                ref={(node) => {
                  questionRefs.current[index] = node;
                }}
                className="rounded-2xl card-flat p-5 scroll-mt-24"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-relaxed">
                    <span className="me-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-surface-muted text-xs text-muted">
                      {index + 1}
                    </span>
                    {question.text}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFlag(question.id)}
                      aria-pressed={isFlagged}
                      title={t("flagForReview")}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 ease-in-out",
                        isFlagged
                          ? "border-amber-500 bg-amber-500/15 text-amber-500"
                          : "border-border bg-surface-muted text-muted hover:border-amber-500/50 hover:text-foreground",
                      )}
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                    <Badge variant="neutral">
                      {t("points", { points: question.points })}
                    </Badge>
                  </div>
                </div>

                <fieldset className="mt-4 space-y-2">
                  {question.options?.map((option, optionIndex) => {
                    const checked = selected === option;
                    return (
                      <label
                        key={optionIndex}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-200 ease-in-out",
                          checked
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border bg-surface-muted hover:border-foreground/40",
                        )}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={checked}
                          onChange={() => setAnswer(question.id, option)}
                          className="h-4 w-4 shrink-0 accent-current"
                        />
                        <span className="leading-relaxed">{option}</span>
                      </label>
                    );
                  })}
                </fieldset>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            loading={submitting}
            disabled={timeUp}
            onClick={() => setConfirmOpen(true)}
          >
            <Send className="h-4 w-4" />
            {t("submit")}
          </Button>
        </div>
      </main>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        className="max-w-md"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t("confirmSubmit")}</h3>
          <p className="text-sm text-muted">
            {unanswered > 0
              ? t("unansweredHint", { count: unanswered })
              : t("confirmSubmitHint")}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => setConfirmOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button loading={submitting} onClick={() => void doSubmit()}>
              <Send className="h-4 w-4" />
              {t("confirmSubmitAction")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}