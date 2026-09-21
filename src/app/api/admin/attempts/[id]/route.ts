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
import { getSubjectLabel } from "@/lib/quiz-data";
import {
  notifyAttemptApproved,
  notifyAttemptRejected,
} from "@/lib/telegram-notify";

function bilingualResultMessage(
  quizTitle: string,
  score: number,
  xpEarned: number,
  rejected: boolean,
): { title: string; message: string } {
  if (rejected) {
    return {
      title: "تم رفض نتيجتك | Your result was rejected",
      message:
        `اختبار «${quizTitle}» — تم رفض المحاولة.\n` +
        `Quiz «${quizTitle}» — this attempt was rejected.`,
    };
  }
  return {
    title: "نتيجتك جاهزة | Your result is ready",
    message:
      `اختبار «${quizTitle}» — النتيجة ${score}% · +${xpEarned} XP\n` +
      `Quiz «${quizTitle}» — Score ${score}% · +${xpEarned} XP`,
  };
}

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(2000).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, username: true, year: true },
        },
        quiz: { include: { questions: { orderBy: { order: "asc" } } } },
      },
    });
    if (!attempt) {
      return NextResponse.json({ ok: false, error: "Attempt not found." }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true, attempt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load attempt." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as unknown;
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request." },
        { status: 400 },
      );
    }
    const { action, note } = parsed.data;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id },
      include: {
        quiz: { include: { questions: true } },
        user: { select: { telegramId: true } },
      },
    });
    if (!attempt) {
      return NextResponse.json({ ok: false, error: "Attempt not found." }, { status: 404 });
    }
    if (attempt.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "This attempt was already reviewed." },
        { status: 409 },
      );
    }

    const adminId = session.user.id;
    const attemptId = attempt.id;
    const answers = parseAnswers(attempt.answers);

    if (action === "reject") {
      await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          status: "rejected",
          note: note ?? null,
          approvedAt: new Date(),
          approvedBy: adminId,
        },
      });

      const notice = bilingualResultMessage(attempt.quiz.title, 0, 0, true);
      await prisma.notification.create({
        data: {
          userId: attempt.userId,
          type: "result",
          title: notice.title,
          message: note
            ? `${notice.message}\n${note}`
            : notice.message,
          link: `/results/${attemptId}`,
        },
      });

      await notifyAttemptRejected(
        attempt.user.telegramId,
        attempt.quiz.title,
        note ?? "not approved",
      );

      return NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const fullQuestions = attempt.quiz.questions.map((q) => ({
      id: q.id,
      type: "mcq" as const,
      text: q.text,
      options: Array.isArray(q.options) ? (q.options as string[]) : null,
      points: q.points,
      order: q.order,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));

    const { rows, score } = buildGrading(fullQuestions, answers);
    const xpEarned = xpForScore(attempt.quiz.xpReward, score);

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: "approved",
        score,
        xpEarned,
        grading: rows,
        note: note ?? null,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    });

    const notice = bilingualResultMessage(
      attempt.quiz.title,
      score,
      xpEarned,
      false,
    );
    await prisma.notification.create({
      data: {
        userId: attempt.userId,
        type: "result",
        title: notice.title,
        message: notice.message,
        link: `/results/${attemptId}`,
      },
    });

    await notifyAttemptApproved(
      attempt.user.telegramId,
      attempt.quiz.title,
      score,
      xpEarned,
      attemptId,
    );

    return NextResponse.json(
      {
        ok: true,
        score,
        xpEarned,
        subject: getSubjectLabel(attempt.quiz.subject, "en"),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}