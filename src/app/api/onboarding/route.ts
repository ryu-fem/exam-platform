import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SYSTEMS, ELECTIVES } from "@/lib/constants";

const schema = z
  .object({
    telegramId: z.string().optional(),
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    year: z.enum(["1", "2", "3"], { message: "Select a grade" }),
    system: z.enum(["general", "azhar", "baccalaureate"], {
      message: "Select a system",
    }),
    track: z.enum(["medicine", "engineering", "business", "arts"]).optional(),
    electiveSubject: z
      .enum(["math", "physics", "chemistry", "programming", "accounting", "business_admin", "psychology", "language"])
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
        const validElectives = (ELECTIVES[data.track] ?? []).map((e) => e.val);
        if (!data.electiveSubject || !validElectives.includes(data.electiveSubject)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["electiveSubject"],
            message: "Select an elective subject for your track",
          });
        }
      }
    } else {
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Please fix the highlighted fields.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const usernameTaken = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (usernameTaken) {
      return NextResponse.json(
        { ok: false, error: "This username is already taken.", issues: { username: ["This username is already taken."] } },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    let user;

    if (data.telegramId) {
      const existing = await prisma.user.findUnique({
        where: { telegramId: data.telegramId },
      });

      if (existing && existing.status === "active") {
        return NextResponse.json(
          { ok: false, error: "This Telegram account is already registered." },
          { status: 409 },
        );
      }

      user = await prisma.user.upsert({
        where: { telegramId: data.telegramId },
        update: {
          name: data.name,
          username: data.username,
          passwordHash,
          year: data.year,
          system: data.system,
          track: data.system === "baccalaureate" ? data.track ?? null : null,
          electiveSubject: data.system === "baccalaureate" ? data.electiveSubject ?? null : null,
          status: "pending",
        },
        create: {
          telegramId: data.telegramId,
          name: data.name,
          username: data.username,
          passwordHash,
          year: data.year,
          system: data.system,
          track: data.system === "baccalaureate" ? data.track ?? null : null,
          electiveSubject: data.system === "baccalaureate" ? data.electiveSubject ?? null : null,
          status: "pending",
          role: "student",
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: data.name,
          username: data.username,
          passwordHash,
          year: data.year,
          system: data.system,
          track: data.system === "baccalaureate" ? data.track ?? null : null,
          electiveSubject: data.system === "baccalaureate" ? data.electiveSubject ?? null : null,
          status: "pending",
          role: "student",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}