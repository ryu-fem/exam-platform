import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyAdminNewStudent } from "@/lib/telegram-notify";
import { verifyOnboardingToken } from "@/lib/telegram-token";
import {
  BACCALAUREATE_ELECTIVES,
  SECTIONS,
  SYSTEMS,
} from "@/lib/curriculum";

const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

const SECTION_VALUES = Array.from(
  new Set(Object.values(SECTIONS).flat().map((s) => s.value)),
);
const SYSTEM_VALUES = Array.from(
  new Set(Object.values(SYSTEMS).flat().map((s) => s.value)),
);

const schema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(
        PASSWORD_POLICY,
        "Password must include an uppercase letter, a lowercase letter, a number and a special character.",
      ),
    year: z.enum(["1", "2", "3"], { message: "Select a grade" }),
    system: z.enum(SYSTEM_VALUES as [string, ...string[]], {
      message: "Select a system",
    }),
    section: z.enum(SECTION_VALUES as [string, ...string[]]).optional(),
    track: z.enum(["medicine", "engineering", "business", "arts"]).optional(),
    electiveSubject: z
      .enum(["math", "physics", "chemistry", "programming", "accounting", "business_admin", "psychology", "second_language"])
      .optional(),
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
      if (!data.track) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["track"],
          message: "Select a track",
        });
      }
      if (data.track) {
        const validElectives = (BACCALAUREATE_ELECTIVES[data.track] ?? []).map(
          (e) => e.value,
        );
        if (!data.electiveSubject || !validElectives.includes(data.electiveSubject)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["electiveSubject"],
            message: "Select an elective subject for your track",
          });
        }
      }
      if (data.section) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["section"],
          message: "Section is only available for General and Azhar systems",
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
      if (data.electiveSubject) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["electiveSubject"],
          message: "Elective subject is only available for Baccalaureate",
        });
      }
    }
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Please fix the highlighted fields.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Registration is Telegram-first only: the caller must present the signed
    // onboarding token issued by /api/auth/telegram after a successful widget
    // check. The telegramId/telegram username/photoUrl locked inside that token
    // are used below and are NEVER accepted from the request body.
    const secret = process.env.NEXTAUTH_SECRET ?? "";
    const authHeader = (request.headers.get("authorization") ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    const telegram = verifyOnboardingToken(authHeader, secret);
    if (!telegram) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Telegram verification is required to register. Please sign in with Telegram again.",
          code: "telegram_required",
        },
        { status: 401 },
      );
    }

    const data = parsed.data;
    const isBaccalaureate = data.system === "baccalaureate";
    const profileFields = {
      year: data.year,
      system: data.system,
      section: isBaccalaureate ? null : (data.section ?? null),
      track: isBaccalaureate ? (data.track ?? null) : null,
      electiveSubject: isBaccalaureate ? (data.electiveSubject ?? null) : null,
    };

    const passwordHash = await bcrypt.hash(data.password, 10);
    const avatarUrl = telegram.photoUrl ?? null;

    const existing = await prisma.user.findUnique({
      where: { telegramId: telegram.telegramId },
    });
    if (existing && existing.status === "active") {
      return NextResponse.json(
        { ok: false, error: "This Telegram account is already registered." },
        { status: 409 },
      );
    }

    // Upsert keyed on telegramId so a partial/abandoned signup can be resumed
    // without leaving an orphaned row behind.
    const user = await prisma.user.upsert({
      where: { telegramId: telegram.telegramId },
      update: {
        name: data.name,
        username: data.username,
        passwordHash,
        ...(avatarUrl ? { avatarUrl } : {}),
        ...profileFields,
        status: "pending",
      },
      create: {
        telegramId: telegram.telegramId,
        name: data.name,
        username: data.username,
        passwordHash,
        ...(avatarUrl ? { avatarUrl } : {}),
        ...profileFields,
        status: "pending",
        role: "student",
      },
    });

    await notifyAdminNewStudent({
      name: user.name,
      year: user.year,
      track: user.track,
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    // Unique constraint violation (username or telegramId) — most likely a
    // race between the pre-checks and the actual upsert.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta.target as string[])
        : [];
      if (target.includes("telegramId")) {
        return NextResponse.json(
          {
            ok: false,
            error: "This Telegram account is already registered.",
            issues: { telegramId: ["This Telegram account is already registered."] },
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: "This username is already taken.",
          issues: { username: ["This username is already taken."] },
        },
        { status: 409 },
      );
    }

    console.error("Onboarding error:", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}