"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TextareaHTMLAttributes } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Field";
import { Alert, ErrorBanner } from "@/components/ui/Alert";
import {
  YEARS,
  SYSTEMS,
  BACCALAUREATE_TRACKS,
  BACCALAUREATE_ELECTIVES,
  sectionsFor,
  subjectsForProfile,
} from "@/lib/curriculum";
import { getSubjectLabel } from "@/lib/quiz-data";
import { cn } from "@/lib/utils";

type EditableQuestion = {
  key: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points: string;
};

type Meta = {
  title: string;
  year: string;
  system: string;
  section: string;
  track: string;
  elective: string;
  subject: string;
  durationMins: string;
  xpReward: string;
  difficulty: string;
};

type ServerQuestion = {
  text: string;
  options?: string[] | null;
  correctAnswer: string;
  explanation?: string | null;
  points: number;
};

type Draft = {
  version: number;
  meta: Meta;
  questions: Omit<EditableQuestion, "key">[];
};

export type QuizEditorProps = {
  quizId?: string;
  onDone: (message: string) => void;
  onCancel: () => void;
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const DRAFT_VERSION = 2;

const DEFAULT_META: Meta = {
  title: "",
  year: "",
  system: "",
  section: "",
  track: "",
  elective: "",
  subject: "",
  durationMins: "30",
  xpReward: "100",
  difficulty: "medium",
};

const JSON_TEMPLATE = `{
  "title": "Quiz Title",
  "subject": "math",
  "year": "2",
  "system": "general",
  "track": "scientific",
  "duration": 30,
  "xp": 100,
  "difficulty": "medium",
  "questions": [
    {
      "type": "mcq",
      "text": "Question text",
      "options": ["a", "b", "c", "d"],
      "answer": 1,
      "explanation": "Explanation"
    }
  ]
}`;

let uid = 0;
function nextKey() {
  uid += 1;
  return `q-${uid}`;
}

function toDraftQuestion(q: EditableQuestion): Omit<EditableQuestion, "key"> {
  return {
    text: q.text,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    points: q.points,
  };
}

function emptyQuestion(): EditableQuestion {
  return {
    key: nextKey(),
    text: "",
    options: ["", "", "", ""],
    correctIndex: -1,
    explanation: "",
    points: "1",
  };
}

function fromServer(q: ServerQuestion): EditableQuestion {
  const opts = (q.options ?? []).slice(0, MAX_OPTIONS);
  const options = opts.length ? opts : ["", "", "", ""];
  return {
    key: nextKey(),
    text: q.text,
    options,
    correctIndex: options.findIndex((o) => o === q.correctAnswer),
    explanation: q.explanation ?? "",
    points: String(q.points),
  };
}

function toPayload(meta: Meta, questions: EditableQuestion[], isBac: boolean) {
  return {
    subject: meta.subject,
    ...(meta.title.trim() ? { title: meta.title.trim() } : {}),
    year: meta.year,
    system: meta.system,
    section: isBac ? null : meta.section || null,
    track: isBac ? meta.track || null : null,
    elective: isBac ? meta.elective || null : null,
    durationMins: Number(meta.durationMins) || 30,
    xpReward: Number(meta.xpReward) || 0,
    difficulty: meta.difficulty,
    questions: questions.map((q) => ({
      type: "mcq",
      text: q.text.trim(),
      options: q.options.map((o) => o.trim()),
      correctAnswer: (q.options[q.correctIndex] ?? "").trim(),
      ...(q.explanation.trim() ? { explanation: q.explanation.trim() } : {}),
      points: Number(q.points) || 1,
    })),
  };
}

function jsonToQuestions(raw: string): {
  questions: EditableQuestion[];
  meta: Partial<Meta>;
  error: string | null;
} {
  const fail = { questions: [] as EditableQuestion[], meta: {} as Partial<Meta>, error: "jsonError" };
  const trimmed = raw.trim();
  if (!trimmed) return fail;

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return fail;
  }

  let list: unknown[];
  let meta: Partial<Meta> = {};

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === "object" && Array.isArray((data as { questions?: unknown }).questions)) {
    const obj = data as Record<string, unknown>;
    list = obj.questions as unknown[];
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    const built: Record<string, string | undefined> = {
      subject: str(obj.subject),
      title: str(obj.title),
      year: str(obj.year),
      system: str(obj.system),
      section: str(obj.section),
      track: str(obj.track),
      elective: str(obj.elective),
      durationMins: obj.duration != null ? String(obj.duration) : obj.durationMins != null ? String(obj.durationMins) : undefined,
      xpReward: obj.xp != null ? String(obj.xp) : obj.xpReward != null ? String(obj.xpReward) : undefined,
      difficulty: str(obj.difficulty),
    };
    meta = Object.fromEntries(
      Object.entries(built).filter(([, v]) => v !== undefined),
    ) as Partial<Meta>;
  } else {
    return fail;
  }

  const questions: EditableQuestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") return fail;
    const q = item as Record<string, unknown>;
    if (q.type !== undefined && q.type !== "mcq") return fail;
    if (typeof q.text !== "string") return fail;
    const opts = Array.isArray(q.options)
      ? q.options.map((o) => String(o)).slice(0, MAX_OPTIONS)
      : [];
    if (opts.length < MIN_OPTIONS) return fail;

    let correctIndex: number;
    if (typeof q.answer === "number") {
      correctIndex = q.answer;
    } else if (typeof q.correctAnswer === "string") {
      correctIndex = opts.indexOf(q.correctAnswer);
    } else {
      return fail;
    }

    questions.push({
      key: nextKey(),
      text: q.text,
      options: opts,
      correctIndex,
      explanation: typeof q.explanation === "string" ? q.explanation : "",
      points: q.points != null ? String(q.points) : "1",
    });
  }

  if (questions.length === 0) return fail;
  return { questions, meta, error: null };
}

export function QuizEditor({ quizId, onDone, onCancel }: QuizEditorProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const [meta, setMeta] = useState<Meta>({ ...DEFAULT_META });
  const [questions, setQuestions] = useState<EditableQuestion[]>(() => [
    emptyQuestion(),
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!quizId);
  const [ready, setReady] = useState(!quizId);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteNotice, setPasteNotice] = useState(false);

  const draftKey = `exam-quiz-draft:${quizId ?? "new"}`;
  const isBac = meta.system === "baccalaureate";

  const loadServer = useCallback(async (): Promise<{
    meta: Meta;
    questions: EditableQuestion[];
  } | null> => {
    if (!quizId) return null;
    const res = await fetch(`/api/admin/quizzes/${quizId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || t("failedToLoadQuizzes"));
    const quiz = data.quiz as {
      subject?: string;
      title?: string;
      year?: string;
      system?: string | null;
      section?: string | null;
      track?: string | null;
      elective?: string | null;
      durationMins?: number;
      xpReward?: number;
      difficulty?: string;
      questions?: ServerQuestion[];
    };
    return {
      meta: {
        title: quiz.title ?? "",
        year: quiz.year ?? "",
        system: quiz.system ?? "",
        section: quiz.section ?? "",
        track: quiz.track ?? "",
        elective: quiz.elective ?? "",
        subject: quiz.subject ?? "",
        durationMins: String(quiz.durationMins ?? 30),
        xpReward: String(quiz.xpReward ?? 100),
        difficulty: quiz.difficulty ?? "medium",
      },
      questions: (quiz.questions ?? []).map(fromServer),
    };
  }, [quizId, t]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      let nextMeta: Meta | null = null;
      let nextQuestions: EditableQuestion[] | null = null;

      if (quizId) {
        try {
          const server = await loadServer();
          if (server) {
            nextMeta = server.meta;
            nextQuestions = server.questions;
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : t("failedToLoadQuizzes"));
            setLoading(false);
            setReady(true);
          }
          return;
        }
      }

      let restored = false;
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const draft = JSON.parse(raw) as Draft;
          if (
            draft?.version === DRAFT_VERSION &&
            draft.meta &&
            Array.isArray(draft.questions)
          ) {
            nextMeta = { ...DEFAULT_META, ...draft.meta };
            nextQuestions = draft.questions.map((q) => ({ ...q, key: nextKey() }));
            restored = true;
          }
        }
      } catch {
        // ignore malformed drafts
      }

      if (cancelled) return;
      if (nextMeta) setMeta(nextMeta);
      if (nextQuestions && nextQuestions.length) setQuestions(nextQuestions);
      setDraftRestored(restored);
      setLoading(false);
      setReady(true);
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [quizId, draftKey, loadServer, t]);

  const stateRef = useRef({ meta, questions });
  useEffect(() => {
    stateRef.current = { meta, questions };
  }, [meta, questions]);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      try {
        const current = stateRef.current;
        const draft: Draft = {
          version: DRAFT_VERSION,
          meta: current.meta,
          questions: current.questions.map(toDraftQuestion),
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setDraftSaved(true);
      } catch {
        // storage unavailable
      }
    }, 5000);
    return () => clearInterval(id);
  }, [ready, draftKey]);

  useEffect(() => {
    if (!draftSaved) return;
    const id = setTimeout(() => setDraftSaved(false), 2500);
    return () => clearTimeout(id);
  }, [draftSaved]);

  const systemOptions = useMemo(
    () =>
      (meta.year ? (SYSTEMS[meta.year] ?? []) : []).map((s) => ({
        value: s.value,
        label: isAr ? s.label.ar : s.label.en,
      })),
    [meta.year, isAr],
  );

  const sectionOptions = useMemo(
    () =>
      (meta.year && meta.system ? sectionsFor(meta.year, meta.system) : []).map((s) => ({
        value: s.value,
        label: isAr ? s.label.ar : s.label.en,
      })),
    [meta.year, meta.system, isAr],
  );

  const trackOptions = useMemo(
    () =>
      BACCALAUREATE_TRACKS.map((tr) => ({
        value: tr.value,
        label: isAr ? tr.label.ar : tr.label.en,
      })),
    [isAr],
  );

  const electiveOptions = useMemo(
    () =>
      (BACCALAUREATE_ELECTIVES[meta.track] ?? []).map((e) => ({
        value: e.value,
        label: isAr ? e.label.ar : e.label.en,
      })),
    [meta.track, isAr],
  );

  const subjectOptions = useMemo(() => {
    const keys = subjectsForProfile({
      year: meta.year,
      system: meta.system,
      section: isBac ? null : meta.section,
      track: isBac ? meta.track : null,
      electiveSubject: isBac ? meta.elective : null,
    });
    return keys.map((key) => ({
      value: key,
      label: getSubjectLabel(key, isAr ? "ar" : "en"),
    }));
  }, [meta.year, meta.system, meta.section, meta.track, meta.elective, isBac, isAr]);

  const sectionRequired =
    !isBac && !!meta.year && !!meta.system && sectionOptions.length > 0;

  const jsonPreview = useMemo(
    () => JSON.stringify(toPayload(meta, questions, isBac), null, 2),
    [meta, questions, isBac],
  );

  function updateMeta(patch: Partial<Meta>) {
    setMeta((m) => ({ ...m, ...patch }));
  }

  function clearError(path: string) {
    setErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }

  function updateQuestion(key: string, patch: Partial<EditableQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function updateOption(key: string, index: number, value: string) {
    clearError(`${key}.options`);
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === key
          ? { ...q, options: q.options.map((o, i) => (i === index ? value : o)) }
          : q,
      ),
    );
  }

  function addOption(key: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === key && q.options.length < MAX_OPTIONS
          ? { ...q, options: [...q.options, ""] }
          : q,
      ),
    );
  }

  function removeOption(key: string, index: number) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.key !== key || q.options.length <= MIN_OPTIONS) return q;
        const options = q.options.filter((_, i) => i !== index);
        let correctIndex = q.correctIndex;
        if (correctIndex === index) correctIndex = -1;
        else if (correctIndex > index) correctIndex -= 1;
        return { ...q, options, correctIndex };
      }),
    );
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
    clearError("questions");
  }

  function removeQuestion(key: string) {
    setQuestions((qs) => qs.filter((q) => q.key !== key));
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!meta.year) next["meta.year"] = t("errYear");
    if (!meta.system) next["meta.system"] = t("errSystem");
    if (sectionRequired && !meta.section) next["meta.section"] = t("errSection");
    if (!meta.subject) next["meta.subject"] = t("errSubject");
    const duration = Number(meta.durationMins);
    if (!Number.isFinite(duration) || duration < 1) next["meta.duration"] = t("errDuration");
    const xp = Number(meta.xpReward);
    if (!Number.isFinite(xp) || xp < 0) next["meta.xp"] = t("errXp");
    if (questions.length === 0) next["questions"] = t("noQuestions");

    for (const q of questions) {
      if (!q.text.trim()) next[`${q.key}.text`] = t("errQuestionText");
      if (q.options.some((o) => !o.trim())) next[`${q.key}.options`] = t("errOption");
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        next[`${q.key}.correct`] = t("errCorrect");
      }
    }
    return next;
  }

  async function save() {
    setError(null);
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setError(t("validationSummary"));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const payload = {
        ...toPayload(meta, questions, isBac),
        ...(quizId ? {} : { questionCount: questions.length }),
      };
      const res = await fetch(quizId ? `/api/admin/quizzes/${quizId}` : "/api/admin/quizzes", {
        method: quizId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || (quizId ? t("failedToUpdate") : t("failedToCreate")),
        );
      }
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      onDone(quizId ? t("saveSuccessToast") : t("quizCreateSuccessToast"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : quizId
            ? t("failedToUpdate")
            : t("failedToCreate"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setDraftRestored(false);
    setErrors({});
    if (quizId) {
      setLoading(true);
      try {
        const server = await loadServer();
        if (server) {
          setMeta(server.meta);
          setQuestions(server.questions.length ? server.questions : [emptyQuestion()]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("failedToLoadQuizzes"));
      } finally {
        setLoading(false);
      }
    } else {
      setMeta({ ...DEFAULT_META });
      setQuestions([emptyQuestion()]);
    }
  }

  function populateFromJson() {
    setPasteError(null);
    setPasteNotice(false);
    const result = jsonToQuestions(pasteText);
    if (result.error) {
      setPasteError(t("jsonError"));
      return;
    }
    setQuestions(result.questions);
    const merged: Partial<Meta> = { ...result.meta };
    if (result.meta.system && result.meta.system !== "baccalaureate" && result.meta.track && !result.meta.section) {
      merged.section = result.meta.track;
      delete merged.track;
    }
    setMeta({ ...meta, ...merged });
    setPasteNotice(true);
  }

  const pageTitle = quizId ? t("editQuiz") : t("newQuizTitle");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted">{t("quizEditorSubtitle")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          {t("backToQuizzes")}
        </Button>
      </header>

      {draftRestored && (
        <Alert variant="info" className="flex items-center justify-between gap-3">
          <span>{t("draftRestored")}</span>
          <button
            type="button"
            onClick={discardDraft}
            className="shrink-0 text-xs font-medium underline underline-offset-2"
          >
            {t("discardDraft")}
          </button>
        </Alert>
      )}

      <ErrorBanner>{error}</ErrorBanner>

      {loading ? (
        <Card className="p-6 text-sm text-muted">{t("loading")}</Card>
      ) : (
        <>
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <Label>{t("quizTitleLabel")}</Label>
                <Input
                  value={meta.title}
                  onChange={(e) => updateMeta({ title: e.target.value })}
                  placeholder={t("quizTitleLabel")}
                  dir={dir}
                />
              </div>
              <div>
                <Label>{t("yearLabel")}</Label>
                <Select
                  value={meta.year}
                  error={errors["meta.year"]}
                  onChange={(e) =>
                    updateMeta({
                      year: e.target.value,
                      system: "",
                      section: "",
                      track: "",
                      elective: "",
                      subject: "",
                    })
                  }
                  placeholder={t("selectYear")}
                  options={YEARS.map((y) => ({
                    value: y.value,
                    label: isAr ? y.label.ar : y.label.en,
                  }))}
                />
              </div>
              <div>
                <Label>{t("systemLabel")}</Label>
                <Select
                  value={meta.system}
                  error={errors["meta.system"]}
                  onChange={(e) =>
                    updateMeta({
                      system: e.target.value,
                      section: "",
                      track: "",
                      elective: "",
                      subject: "",
                    })
                  }
                  placeholder={t("selectSystem")}
                  disabled={!meta.year}
                  options={systemOptions}
                />
              </div>
              {isBac ? (
                <>
                  <div>
                    <Label>{t("trackLabel")}</Label>
                    <Select
                      value={meta.track}
                      onChange={(e) =>
                        updateMeta({ track: e.target.value, elective: "", subject: "" })
                      }
                      placeholder={t("selectTrack")}
                      options={trackOptions}
                    />
                  </div>
                  <div>
                    <Label>{t("electiveLabel")}</Label>
                    <Select
                      value={meta.elective}
                      onChange={(e) => updateMeta({ elective: e.target.value, subject: "" })}
                      placeholder={t("allElectives")}
                      disabled={!meta.track}
                      options={electiveOptions}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label>{t("sectionLabel")}</Label>
                  <Select
                    value={meta.section}
                    error={errors["meta.section"]}
                    onChange={(e) => updateMeta({ section: e.target.value, subject: "" })}
                    placeholder={t("selectSection")}
                    disabled={!meta.system || sectionOptions.length === 0}
                    options={sectionOptions}
                  />
                </div>
              )}
              <div>
                <Label>{t("subjectLabel")}</Label>
                <Select
                  value={meta.subject}
                  error={errors["meta.subject"]}
                  onChange={(e) => updateMeta({ subject: e.target.value })}
                  placeholder={t("selectSubject")}
                  disabled={!meta.system}
                  options={subjectOptions}
                />
              </div>
              <div>
                <Label>{t("minutesLabel")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={600}
                  value={meta.durationMins}
                  error={errors["meta.duration"]}
                  onChange={(e) => updateMeta({ durationMins: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("xpLabel")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  value={meta.xpReward}
                  error={errors["meta.xp"]}
                  onChange={(e) => updateMeta({ xpReward: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("difficultyLabel")}</Label>
                <Select
                  value={meta.difficulty}
                  onChange={(e) => updateMeta({ difficulty: e.target.value })}
                  options={[
                    { value: "easy", label: t("difficultyEasy") },
                    { value: "medium", label: t("difficultyMedium") },
                    { value: "hard", label: t("difficultyHard") },
                  ]}
                />
              </div>
            </div>
          </Card>

          {!quizId && (
            <Card className="space-y-3 p-5">
              <button
                type="button"
                onClick={() => setPasteOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 text-start text-sm font-semibold"
              >
                <span>{t("pasteJsonLabel")}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out",
                    pasteOpen && "rotate-180",
                  )}
                />
              </button>
              {pasteOpen && (
                <div className="space-y-2">
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    dir="ltr"
                    rows={8}
                    placeholder={JSON_TEMPLATE}
                    className="w-full rounded-lg border border-border bg-surface p-3 font-mono text-xs leading-relaxed transition-all duration-200 ease-in-out focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/25"
                  />
                  {pasteError && <p className="text-xs text-danger">{pasteError}</p>}
                  {pasteNotice && (
                    <p className="text-xs text-success">{t("populateSuccess")}</p>
                  )}
                  <Button type="button" size="sm" variant="secondary" onClick={populateFromJson}>
                    {t("populateForm")}
                  </Button>
                </div>
              )}
            </Card>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">
                {t("questionsHeader", { count: questions.length })}
              </h2>
              {draftSaved && (
                <span className="text-xs text-muted">{t("draftSaved")}</span>
              )}
            </div>

            {errors["questions"] && (
              <p className="text-xs text-danger">{errors["questions"]}</p>
            )}

            {questions.length === 0 ? (
              <Card className="p-6 text-sm text-muted">{t("noQuestions")}</Card>
            ) : (
              questions.map((q, index) => (
                <Card key={q.key} className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{t("questionNumber", { number: index + 1 })}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        {t("pointsLabel")}
                        <span className="block w-20">
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={q.points}
                            onChange={(e) =>
                              updateQuestion(q.key, { points: e.target.value })
                            }
                          />
                        </span>
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeQuestion(q.key)}
                        aria-label={t("removeQuestion")}
                        className="text-danger hover:bg-danger-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>{t("questionTextLabel")}</Label>
                    <AutoTextarea
                      value={q.text}
                      onChange={(value) => {
                        clearError(`${q.key}.text`);
                        updateQuestion(q.key, { text: value });
                      }}
                      placeholder={t("questionTextPlaceholder")}
                      dir={dir}
                      rows={2}
                      error={errors[`${q.key}.text`]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="mb-0">{t("optionsLabel")}</Label>
                    {q.options.map((option, optionIndex) => {
                      const selected = q.correctIndex === optionIndex;
                      return (
                        <div
                          key={optionIndex}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border bg-surface px-2 py-1.5 transition-all duration-200 ease-in-out",
                            selected ? "border-foreground" : "border-border",
                          )}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.key}`}
                            checked={selected}
                            onChange={() => {
                              clearError(`${q.key}.correct`);
                              updateQuestion(q.key, { correctIndex: optionIndex });
                            }}
                            title={t("markCorrectTitle", { number: optionIndex + 1 })}
                            className="h-4 w-4 shrink-0 cursor-pointer accent-foreground"
                          />
                          <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted">
                            {OPTION_LETTERS[optionIndex]}
                          </span>
                          <input
                            value={option}
                            onChange={(e) =>
                              updateOption(q.key, optionIndex, e.target.value)
                            }
                            placeholder={t("optionPlaceholder", {
                              number: optionIndex + 1,
                              state: selected ? t("optionCorrect") : t("optionWrong"),
                            })}
                            dir={dir}
                            className="h-9 w-full min-w-0 bg-transparent text-sm placeholder:text-muted focus:outline-none"
                          />
                          {q.options.length > MIN_OPTIONS && (
                            <button
                              type="button"
                              onClick={() => removeOption(q.key, optionIndex)}
                              aria-label={t("removeOption")}
                              className="shrink-0 text-muted transition-colors duration-200 ease-in-out hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {errors[`${q.key}.options`] && (
                      <p className="text-xs text-danger">{errors[`${q.key}.options`]}</p>
                    )}
                    {errors[`${q.key}.correct`] && (
                      <p className="text-xs text-danger">{errors[`${q.key}.correct`]}</p>
                    )}
                    {q.options.length < MAX_OPTIONS && (
                      <button
                        type="button"
                        onClick={() => addOption(q.key)}
                        className="inline-flex items-center gap-1 text-xs text-muted underline-offset-2 transition-colors duration-200 ease-in-out hover:text-foreground hover:underline"
                      >
                        <Plus className="h-3 w-3" />
                        {t("addOption")}
                      </button>
                    )}
                  </div>

                  <div>
                    <Label>{t("explanationLabel")}</Label>
                    <AutoTextarea
                      value={q.explanation}
                      onChange={(value) => updateQuestion(q.key, { explanation: value })}
                      dir={dir}
                      rows={2}
                    />
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={addQuestion}>
              <Plus className="h-4 w-4" />
              {t("addQuestion")}
            </Button>
            <div className="ms-auto flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
                {t("cancel")}
              </Button>
              <Button type="button" onClick={save} loading={busy}>
                {t("saveChanges")}
              </Button>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowJson((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-2 transition-colors duration-200 ease-in-out hover:text-foreground hover:underline"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200 ease-in-out",
                  showJson && "rotate-180",
                )}
              />
              {showJson ? t("hideJson") : t("showJson")}
            </button>
            {showJson && (
              <pre
                dir="ltr"
                className="mt-2 max-h-96 overflow-auto rounded-lg border border-border bg-surface-muted p-3 font-mono text-xs leading-relaxed"
              >
                {jsonPreview}
              </pre>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AutoTextarea({
  value,
  onChange,
  error,
  className,
  rows = 2,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="w-full">
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full resize-none rounded-lg border bg-surface px-3.5 py-2.5 text-sm leading-relaxed",
          "placeholder:text-muted transition-all duration-200 ease-in-out",
          "focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/25",
          error ? "border-danger focus:ring-danger/25" : "border-border",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}