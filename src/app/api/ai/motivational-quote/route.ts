import { NextResponse } from "next/server";

import { askGroq } from "@/lib/groq";

export const dynamic = "force-dynamic";

const TOPICS = [
  "consistency",
  "exams",
  "focus",
  "confidence",
  "goals",
  "discipline",
];

const FALLBACK_QUOTES = [
  "الاجتهاد النهارده هو نجاح بكرة. كمّل ومتوقفش.",
  "التعب اللي بتحسه دلوقتي بيبني مستقبلك. اصبر وأكمل.",
  "كل سؤال بتجاوب عليه بيقربك من هدفك. ركّز وداوم.",
  "الوقت اللي بتنظمه دلوقتي هيرجعلك أضعاف في الامتحانات.",
  "متقارنش نفسك بحد — قارن نفسك بنفسك اللي امبارك، وطوّر.",
  "النجاح مش بييجي صدفة، بييجي بالمراجعة والاستمرارية.",
];

function pick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export async function GET() {
  const topic = pick(TOPICS);

  const content = await askGroq(
    [
      {
        role: "system",
        content:
          "You are a warm and friendly Egyptian tutor for secondary-school students. " +
          "Respond ONLY in Egyptian Arabic dialect (عامية مصرية). " +
          "Write one short, punchy motivational sentence (1-2 sentences max), like a coach speaking directly to a student. " +
          "Never use MSA, never write in English, and never add explanations, quotation marks, or hashtags.",
      },
      {
        role: "user",
        content: `Write a fresh, original daily motivational quote about "${topic}". Make it different from anything you've said before.`,
      },
    ],
    { temperature: 1, maxTokens: 80 },
  );

  const quote = content ?? pick(FALLBACK_QUOTES);

  return NextResponse.json(
    { quote, topic, generated: Boolean(content) },
    { headers: { "Cache-Control": "no-store" } },
  );
}