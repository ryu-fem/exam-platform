import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  SECTIONS,
  SYSTEMS,
  BACCALAUREATE_TRACKS,
} from "@/lib/curriculum";

const questionSchema = z.object({
  type: z.literal("mcq").optional(),
  text: z.string().trim().min(1, "Question text is required"),
  options: z.array(z.string().trim().min(1)).default([]),
  correctAnswer: z.string().trim().min(1, "Correct answer is required"),
  explanation: z.string().trim().optional().nullable(),
  points: z.coerce.number().int().min(1).max(100),
  order: z.coerce.number().int().min(0).optional(),
});

const createSchema = z
  .object({
    subject: z.string().min(1, "Subject is required"),
    title: z.string().trim().optional(),
    year: z.enum(["1", "2", "3"], { message: "Select a year" }),
    system: z.enum(["general", "azhar", "baccalaureate"], {
      message: "Select a system",
    }),
    section: z.string().optional().nullable(),
    track: z.string().optional().nullable(),
    elective: z.string().optional().nullable(),
    questionCount: z.coerce.number().int().min(1).max(200),
    durationMins: z.coerce.number().int().min(1).max(600),
    xpReward: z.coerce.number().int().min(0).max(10000),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    questions: z.array(questionSchema).min(1, "Add at least one question"),
  })
  .superRefine((data, ctx) => {
    data.questions.forEach((q, index) => {
      if (q.options.length < 2 || q.options.length > 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "options"],
          message: "MCQ needs between 2 and 6 options",
        });
      }
      if (!q.options.includes(q.correctAnswer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["questions", index, "correctAnswer"],
          message: "Correct answer must match one of the options",
        });
      }
    });
  })
  .superRefine((data, ctx) => {
    const validSystems = (SYSTEMS[data.year] ?? []).map((s) => s.value);
    if (!validSystems.includes(data.system)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["system"],
        message: "System does not match the selected year",
      });
    }

    if (data.system === "baccalaureate") {
      const validTracks = BACCALAUREATE_TRACKS.map((t) => t.value);
      if (data.track && !validTracks.includes(data.track)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["track"],
          message: "Invalid track",
        });
      }
      // Baccalaureate quizzes always need the profile's base subjects;
      // the elective narrows it further. `section` is not used here.
      if (!data.track && data.elective) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["elective"],
          message: "Elective requires a track first",
        });
      }
    } else {
      const validSections = (SECTIONS[`${data.year}:${data.system}`] ?? []).map(
        (s) => s.value,
      );
      if (validSections.length > 0) {
        if (!data.section || !validSections.includes(data.section)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["section"],
            message: "Select a section",
          });
        }
      } else if (data.section) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["section"],
          message: "Section is not offered for this grade and system",
        });
      }

      if (data.track) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["track"],
          message: "Track is only available for Baccalaureate",
        });
      }
      if (data.elective) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["elective"],
          message: "Elective is only available for Baccalaureate",
        });
      }
    }
  });

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const quizzes = await prisma.quiz.findMany({
      orderBy: [{ year: "asc" }, { createdAt: "desc" }],
    });

    // Safe to CDN-cache: the quiz catalog is identical for every admin.
    return NextResponse.json(
      { ok: true, quizzes },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load quizzes" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
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

    if (questionsData.length !== data.questionCount) {
      return NextResponse.json(
        { ok: false, error: "Question count mismatch. Please try again." },
        { status: 400 },
      );
    }

    const quiz = await prisma.quiz.create({
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
        createdBy: session.user.id,
        questions: { create: questionsData },
      },
      include: { questions: true },
    });

    return NextResponse.json(
      { ok: true, quiz },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}