export type QuestionType = "mcq";

/**
 * A question ready to be handed to the client. NEVER includes `correctAnswer`
 * or `explanation` — those would leak the answers during the quiz.
 */
export type SafeQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  options: string[] | null;
  points: number;
  order: number;
};

/** A question as stored in the database (includes the answer fields). */
export type FullQuestion = SafeQuestion & {
  correctAnswer: string;
  explanation: string | null;
};

export type GradingRow = {
  questionId: string;
  correct: boolean;
  pointsAwarded: number;
  pointsTotal: number;
  reason?: string | null;
};

/**
 * Answers as stored on an attempt: `{ [questionId]: rawAnswer }`.
 * MCQ answers are the selected option text.
 */
export type AttemptAnswers = Record<string, string>;

export function stripAnswerFields<T extends FullQuestion>(questions: T[]) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return questions.map(({ correctAnswer: _c, explanation: _e, ...safe }) => safe);
}

export function parseAnswers(raw: unknown): AttemptAnswers {
  if (!raw || typeof raw !== "object") return {};
  const out: AttemptAnswers = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export function parseGrading(raw: unknown): GradingRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && typeof row.questionId === "string",
    )
    .map((row) => ({
      questionId: row.questionId as string,
      correct: Boolean(row.correct),
      pointsAwarded: Number(row.pointsAwarded) || 0,
      pointsTotal: Number(row.pointsTotal) || 0,
      reason:
        typeof row.reason === "string" && row.reason.trim() ? row.reason : null,
    }));
}

/**
 * Auto-grade an MCQ-only attempt. Returns a grading row per question plus the
 * final percentage (rounded).
 */
export function buildGrading(
  questions: FullQuestion[],
  answers: AttemptAnswers,
): { rows: GradingRow[]; score: number } {
  let totalPoints = 0;
  let awardedPoints = 0;
  const rows: GradingRow[] = [];

  for (const q of questions) {
    const answer = answers[q.id] ?? "";
    const pointsTotal = Math.max(1, q.points);
    totalPoints += pointsTotal;

    const correct = answer !== "" && answer === q.correctAnswer;
    const reason = !correct && answer === "" ? "No answer submitted." : null;

    rows.push({
      questionId: q.id,
      correct,
      pointsAwarded: correct ? pointsTotal : 0,
      pointsTotal,
      reason,
    });
    if (correct) awardedPoints += pointsTotal;
  }

  const score = totalPoints > 0 ? Math.round((awardedPoints / totalPoints) * 100) : 0;
  return { rows, score };
}

/** Convert a percentage score into the XP actually earned. */
export function xpForScore(xpReward: number, score: number): number {
  return Math.round((xpReward * score) / 100);
}