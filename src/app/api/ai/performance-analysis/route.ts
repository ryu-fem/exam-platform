import { NextResponse } from "next/server";

import { askGroq } from "@/lib/groq";
import { isLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

type StatsPayload = {
  name?: unknown;
  year?: unknown;
  system?: unknown;
  track?: unknown;
  electiveSubject?: unknown;
  completedQuizzes?: unknown;
  averageScore?: unknown;
  xp?: unknown;
  level?: unknown;
  bestSubject?: unknown;
  locale?: unknown;
};

function buildFallback(
  stats: {
    completedQuizzes: number;
    averageScore: number;
    name: string;
    bestSubject: string | null;
  },
  locale: "ar" | "en",
): string {
  if (stats.completedQuizzes === 0) {
    return locale === "ar"
      ? "لسه مخلصتش أي اختبار لحد دلوقتي. أول خطوة هي إنك تبدأ — اختار اختبار من القايمة وابدأ، وبعدها هتلاقي تحليل كامل لأدائك. شدّ حيلك! 💪"
      : "You haven't completed any quizzes yet. The first step is simply starting — pick a quiz from the list, and you'll get a full analysis after that. You've got this! 💪";
  }

  const tip = stats.bestSubject
    ? locale === "ar"
      ? `مادتك المفضلة والأقوى لحد دلوقتي هي ${stats.bestSubject} — كمّل على النجاح ده.`
      : `Your strongest subject so far is ${stats.bestSubject} — keep building on that momentum.`
    : "";

  return locale === "ar"
    ? `خلصت ${stats.completedQuizzes} اختبارات بمتوسط ${stats.averageScore}%. ${tip} ركّز على مراجعة إجاباتك الغلط بعد كل اختبار، ونظّم وقتك بثبات عشان ترفع مستواك نقطة ورا نقطة. كمّل، إحنا فخورين بيك!`
    : `You've completed ${stats.completedQuizzes} quizzes with an average of ${stats.averageScore}%. ${tip} Revisit your wrong answers after each quiz and keep a steady study rhythm to push your level higher. Keep going — we're proud of you!`;
}

export async function POST(request: Request) {
  let body: StatsPayload = {};
  try {
    body = (await request.json()) as StatsPayload;
  } catch {
    // Invalid or empty body — fall back to the template analysis.
  }

  const locale = isLocale(body.locale) ? body.locale : "en";

  const stats = {
    name: typeof body.name === "string" ? body.name : "Student",
    completedQuizzes: Math.max(0, Number(body.completedQuizzes) || 0),
    averageScore: Math.max(0, Number(body.averageScore) || 0),
    xp: Math.max(0, Number(body.xp) || 0),
    level: Math.max(1, Number(body.level) || 1),
    bestSubject: typeof body.bestSubject === "string" ? body.bestSubject : null,
  };

  const content = await askGroq(
    [
      {
        role: "system",
        content:
          locale === "ar"
            ? "You are a supportive EdTech assistant analyzing a student's quiz performance. " +
              "Reply ONLY in Egyptian Arabic dialect (عامية مصرية). " +
              "Be encouraging, specific, and give ONE concrete improvement tip. " +
              "Keep it to 3-4 short sentences. No markdown, no lists, no hashtags."
            : "You are a supportive EdTech assistant analyzing a student's quiz performance. " +
              "Be encouraging, specific, and give ONE concrete improvement tip. " +
              "Keep it to 3-4 short sentences. No markdown, no lists, no hashtags.",
      },
      {
        role: "user",
        content: [
          `Student name: ${stats.name}`,
          `Quizzes completed: ${stats.completedQuizzes}`,
          `Average score: ${stats.averageScore}%`,
          `Total XP: ${stats.xp}`,
          `Level: ${stats.level}`,
          stats.bestSubject ? `Best subject: ${stats.bestSubject}` : null,
        ]
          .filter(Boolean)
          .join("\n") + "\n\nWrite a short, encouraging performance analysis.",
      },
    ],
    { temperature: 0.7, maxTokens: 220 },
  );

  return NextResponse.json(
    {
      analysis: content ?? buildFallback(stats, locale),
      generated: Boolean(content),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}