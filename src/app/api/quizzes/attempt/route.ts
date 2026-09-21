import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildGrading,
  parseAnswers,
  xpForScore,
} from "@/lib/quiz-engine";
import { notifyAttemptApproved } from "@/lib/telegram-notify";

const schema = z.object({
  quizId: z.string().min(1),
  answers: z.record(z.string(), z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "Your account is not active." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid submission.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { quizId, answers } = parsed.data;
    const answersMap = parseAnswers(answers);

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          select: {
            id: true,
            type: true,
            text: true,
            options: true,
            points: true,
            order: true,
            correctAnswer: true,
            explanation: true,
          },
        },
      },
    });
    if (!quiz) {
      return NextResponse.json({ ok: false, error: "Quiz not found." }, { status: 404 });
    }

    // The quiz must belong to the student's profile.
    const matchesProfile =
      quiz.year === user.year &&
      (!quiz.system || quiz.system === user.system) &&
      (!quiz.section || quiz.section === user.section) &&
      (!quiz.track || quiz.track === user.track) &&
      (!quiz.elective || quiz.elective === user.electiveSubject);

    if (!matchesProfile) {
      return NextResponse.json(
        { ok: false, error: "This quiz is not available for your profile." },
        { status: 403 },
      );
    }

    if (quiz.questions.length === 0) {
      return NextResponse.json(
        { ok: false, error: "This quiz has no questions yet." },
        { status: 400 },
      );
    }

    // Only answer submitted question ids are kept.
    const questionIds = new Set(quiz.questions.map((q) => q.id));
    const cleanAnswers: Record<string, string> = {};
    for (const [id, value] of Object.entries(answersMap)) {
      if (questionIds.has(id) && value.trim()) cleanAnswers[id] = value;
    }

    const existing = await prisma.quizAttempt.findFirst({
      where: { userId: user.id, quizId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "You already submitted this quiz." },
        { status: 409 },
      );
    }

    // All questions are auto-graded MCQs.
    const fullQuestions = quiz.questions.map((q) => ({
      id: q.id,
      type: "mcq" as const,
      text: q.text,
      options: Array.isArray(q.options) ? (q.options as string[]) : [],
      points: q.points,
      order: q.order,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));
    const { rows, score } = buildGrading(fullQuestions, cleanAnswers);
    const xpEarned = xpForScore(quiz.xpReward, score);

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId,
        answers: cleanAnswers,
        grading: rows,
        score,
        xpEarned,
        status: "approved",
        approvedAt: new Date(),
      },
    });

    const notice = {
      title: "نتيجتك جاهزة | Your result is ready",
      message:
        `اختبار «${quiz.title}» — النتيجة ${score}% · +${xpEarned} XP\n` +
        `Quiz «${quiz.title}» — Score ${score}% · +${xpEarned} XP`,
    };
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "result",
        title: notice.title,
        message: notice.message,
        link: `/results/${attempt.id}`,
      },
    });

    await notifyAttemptApproved(user.telegramId, quiz.title, score, xpEarned, attempt.id);

    return NextResponse.json(
      { ok: true, attemptId: attempt.id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}