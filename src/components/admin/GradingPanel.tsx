"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Field";
import { Alert, ErrorBanner } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";
import { parseAnswers, parseGrading } from "@/lib/quiz-engine";
import { getSubjectLabel } from "@/lib/quiz-data";

type AttemptListItem = {
  id: string;
  status: string;
  score: number;
  xpEarned: number;
  submittedAt: string;
  user: { id: string; name: string; username: string; year: string };
  quiz: { id: string; title: string; subject: string; xpReward: number; questionCount: number };
};

type Question = {
  id: string;
  type: string;
  text: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  points: number;
  order: number;
};

type FullAttempt = AttemptListItem & {
  answers: unknown;
  grading: unknown;
  note: string | null;
  approvedAt: string | null;
  quiz: AttemptListItem["quiz"] & { questions: Question[] };
};

function attemptKey(status: string): "attempt_pending" | "attempt_approved" | "attempt_rejected" {
  if (status === "approved") return "attempt_approved";
  if (status === "rejected") return "attempt_rejected";
  return "attempt_pending";
}

export function GradingPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [tab, setTab] = useState<"pending" | "history">("pending");

  const [items, setItems] = useState<AttemptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [detail, setDetail] = useState<FullAttempt | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", tab === "pending" ? "pending" : "all");
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/attempts?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("failedToLoadAttempts"));
      const all = data.attempts as AttemptListItem[];
      setItems(tab === "pending" ? all : all.filter((a) => a.status !== "pending"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToLoadAttempts"));
    } finally {
      setLoading(false);
    }
  }, [tab, q, t]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setActionError(null);
    setNote("");
    try {
      const res = await fetch(`/api/admin/attempts/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("failedToLoadAttempt"));
      setDetail(data.attempt as FullAttempt);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToLoadAttempt"));
    } finally {
      setDetailLoading(false);
    }
  }

  async function review(action: "approve" | "reject") {
    if (!detail) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/attempts/${detail.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("reviewFailed"));
      setNotice(
        action === "approve"
          ? t("approvedNoticeAttempt", { score: data.score, xp: data.xpEarned })
          : t("rejectedNoticeAttempt"),
      );
      setDetail(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("reviewFailed"));
    } finally {
      setBusy(false);
    }
  }

  const answers = useMemo(() => (detail ? parseAnswers(detail.answers) : {}), [detail]);
  const grading = useMemo(() => (detail ? parseGrading(detail.grading) : []), [detail]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("navGrading")}</h1>
        <p className="mt-1 text-sm text-muted">{t("gradingSubtitle")}</p>
      </header>

      {notice && (
        <Alert variant="success" className="flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}
      <ErrorBanner>{error}</ErrorBanner>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex gap-1">
          {(["pending", "history"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out cursor-pointer",
                tab === key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {key === "pending" ? t("tabPendingGrading") : t("tabHistory")}
            </button>
          ))}
        </div>
        <div className="relative mb-2 w-full sm:w-64">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchAttemptsPlaceholder")}
            className="ps-9"
          />
        </div>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted">{t("loading")}</Card>
      ) : items.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          {tab === "pending" ? t("noPendingAttempts") : t("noHistoryAttempts")}
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-4 py-3 text-start font-medium">{t("colStudent")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("colQuiz")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("colScore")}</th>
                  <th className="hidden px-4 py-3 text-start font-medium sm:table-cell">{t("colDate")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item.id)}
                    className="cursor-pointer border-b border-border last:border-0 transition-colors duration-200 ease-in-out hover:bg-surface-muted"
                  >
                    <td className="px-4 py-3 font-medium">{item.user?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{item.quiz?.title ?? "—"}</td>
                    <td className="px-4 py-3">
                      {item.status === "approved" ? `${item.score}%` : "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">
                      {new Date(item.submittedAt).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          item.status === "approved"
                            ? "success"
                            : item.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {t(attemptKey(item.status))}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!detail || detailLoading}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.user.name} · ${detail.quiz.title}` : t("loadingAttempt")}
        className="max-w-3xl"
      >
        {detail && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {getSubjectLabel(detail.quiz.subject, locale as "en" | "ar")} · {t("xpAvailable", { xp: detail.quiz.xpReward })}
            </p>

            {detail.quiz.questions.map((question, index) => {
              const answer = answers[question.id] ?? "";
              const gradeRow = grading.find((row) => row.questionId === question.id);
              return (
                <div key={question.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">
                      {index + 1}. {question.text}
                    </p>
                    <Badge variant="neutral">{t("mcqBadge")}</Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <div>
                      <span className="text-xs text-muted">{t("studentAnswer")}</span>
                      <p className={cn("mt-0.5 rounded-md bg-surface-muted px-3 py-2", !answer && "italic text-muted")}>
                        {answer || t("noAnswerSubmitted")}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-muted">{t("correctAnswer")}</span>
                      <span className="font-medium">{question.correctAnswer}</span>
                      <Badge variant={answer === question.correctAnswer ? "success" : "danger"}>
                        {answer === question.correctAnswer ? t("correctWord") : t("incorrectWord")}
                      </Badge>
                    </div>

                    {gradeRow && (
                      <p className="text-xs text-muted">
                        {t("autoResult")} {gradeRow.correct ? t("correctWord") : t("incorrectWord")} ·{" "}
                        {t("ptsSuffix", { points: gradeRow.pointsAwarded })}
                      </p>
                    )}
                    {question.explanation && (
                      <p className="text-xs text-muted">{t("explanationPrefix")} {question.explanation}</p>
                    )}
                  </div>
                </div>
              );
            })}

            <div>
              <Label htmlFor="grading-note">{t("noteLabel")}</Label>
              <textarea
                id="grading-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t("notePlaceholder")}
                className="w-full rounded-lg border border-border bg-surface p-3 text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-foreground/25"
              />
            </div>

            <ErrorBanner>{actionError}</ErrorBanner>

            {detail.status === "pending" ? (
              <div className="flex justify-end gap-2">
                <Button variant="danger" onClick={() => review("reject")} loading={busy}>
                  {t("rejectAttempt")}
                </Button>
                <Button onClick={() => review("approve")} loading={busy}>
                  {t("approveNotify")}
                </Button>
              </div>
            ) : (
              <Alert variant={detail.status === "approved" ? "success" : "danger"}>
                {detail.status === "approved"
                  ? t("approvedNoticeAttempt", { score: detail.score, xp: detail.xpEarned })
                  : t("rejectedNoticeAttempt")}
              </Alert>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}