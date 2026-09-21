import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendTelegramMessage,
  notifyBroadcast,
} from "@/lib/telegram-notify";

const schema = z
  .object({
    type: z.enum(["broadcast", "direct"]),
    message: z.string().trim().min(1, "Message is required").max(4000),
    userId: z.string().optional(),
    // Optional broadcast filters — when omitted, all active students are targeted.
    filter: z
      .object({
        year: z.string().optional(),
        system: z.string().optional(),
        track: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "direct" && !data.userId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userId"],
        message: "Please choose a student.",
      });
    }
  });

const BROADCAST_TITLE = "إعلان من الأدمن | Announcement from admin";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const grouped = await prisma.notification.groupBy({
      by: ["message"],
      where: { type: "system", title: BROADCAST_TITLE },
      _min: { createdAt: true },
      _count: { _all: true },
      orderBy: { _min: { createdAt: "desc" } },
      take: 50,
    });

    const broadcasts = grouped.map((row) => ({
      message: row.message,
      createdAt: row._min.createdAt,
      recipients: row._count._all,
    }));

    return NextResponse.json(
      { ok: true, broadcasts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load broadcasts" },
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

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { type, message, userId, filter } = parsed.data;

    if (type === "direct") {
      const user = await prisma.user.findUnique({
        where: { id: userId as string },
        select: { id: true, telegramId: true },
      });
      if (!user) {
        return NextResponse.json({ ok: false, error: "Student not found." }, { status: 404 });
      }

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "system",
          title: "رسالة من الأدمن | Message from admin",
          message,
          link: null,
        },
      });

      const botSent = await sendTelegramMessage(user.telegramId, message);

      return NextResponse.json(
        { ok: true, botSent },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // Broadcast — target active students, optionally filtered.
    const where: Record<string, unknown> = {
      role: "student",
      status: "active",
    };
    if (filter?.year) where.year = filter.year;
    if (filter?.system) where.system = filter.system;
    if (filter?.track) where.track = filter.track;

    const users = await prisma.user.findMany({
      where,
      select: { id: true, telegramId: true },
    });

    let created = 0;
    if (users.length > 0) {
      const result = await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: "system",
          title: "إعلان من الأدمن | Announcement from admin",
          message,
          link: null,
        })),
      });
      created = result.count;
    }

    const botSent = await notifyBroadcast(users, message);

    return NextResponse.json(
      { ok: true, targeted: users.length, created, botSent },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}