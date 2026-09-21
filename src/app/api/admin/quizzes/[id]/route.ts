import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SECTIONS, SYSTEMS, BACCALAUREATE_TRACKS } from "@/lib/curriculum";

const questionSchema = z.object({
  type: z.literal("mcq").optional(),
  text: z.string().trim().min(1, "Question text is required"),
  options: z.array(z.string().trim().min(1)).default([]),
  correctAnswer: z.string().trim().min(1, "Correct answer is required"),
  explanation: z.string().trim().optional().nullable(),
  points: z.coerce.number().int().min(1).max(100),
  order: z.coerce.number().int().min(0).optional(),
});

const updateSchema = z
  .object({
    subject: z.string().min(1),
    title: z.string().trim().optional(),
    year: z.enum(["1", "2", "3"]),
    system: z.enum(["general", "azhar", "baccalaureate"]),
    section: z.string().optional().nullable(),
    track: z.string().optional().nullable(),
    elective: z.string().optional().nullable(),
    durationMins: z.coerce.number().int().min(1).max(600),
    xpReward: z.coerce.number().int().min(0).max(10000),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    questions: z.array(questionSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const validSystems = (SYSTEMS[data.year] ?? []).map((s) => s.value);
    if (!validSystems.includes(data.system)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["system"], message: "Invalid system for year" });
    }
    if (data.system === "baccalaureate") {
      if (data.track && !BACCALAUREATE_TRACKS.some((t) => t.value === data.track)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["track"], message: "Invalid track" });
      }
    } else {
      const validSections = (SECTIONS[`${data.year}:${data.system}`] ?? []).map((s) => s.value);
      if (validSections.length > 0 && (!data.section || !validSections.includes(data.section))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["section"], message: "Select a section" });
      }
    }
    data.questions.forEach((q, index) => {
      if (q.options.length < 2 || q.options.length > 6) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["questions", index, "options"], message: "MCQ needs 2-6 options" });
      }
      if (!q.options.includes(q.correctAnswer)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["questions", index, "correctAnswer"], message: "Correct answer must match an option" });
      }
    });
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
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!quiz) {
      return NextResponse.json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true, quiz },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load quiz" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Please fix the highlighted fields.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const isBaccalaureate = data.system === "baccalaureate";
    const questionsData = data.questions.map((q, index) => ({
      type: "mcq",
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? null,
      points: q.points,
      order: q.order ?? index,
    }));

    const quiz = await prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { quizId: id } });
      return tx.quiz.update({
        where: { id },
        data: {
          subject: data.subject,
          title: data.title?.trim() || data.subject,
          year: data.year,
          system: data.system,
          section: isBaccalaureate ? null : (data.section ?? null),
          track: isBaccalaureate ? (data.track ?? null) : null,
          elective: isBaccalaureate ? (data.elective ?? null) : null,
          questionCount: questionsData.length,
          durationMins: data.durationMins,
          xpReward: data.xpReward,
          difficulty: data.difficulty,
          questions: { create: questionsData },
        },
        include: { questions: true },
      });
    });

    return NextResponse.json(
      { ok: true, quiz },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to update quiz" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.quiz.delete({ where: { id } });

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Quiz not found or could not be deleted." },
      { status: 500 },
    );
  }
}