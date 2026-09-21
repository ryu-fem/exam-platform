import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        username: true,
        telegramId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { ok: true, admins, currentUserId: session.user.id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load admins" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  telegramId: z.string().trim().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Please fix the highlighted fields.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, username, password, telegramId } = parsed.data;
    const lower = username.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: lower }, { username: lower.replace(/_/g, "") }],
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Username already taken.", issues: { username: ["Username already taken."] } },
        { status: 409 },
      );
    }

    const tgId = telegramId?.trim() || null;
    if (tgId) {
      const tgTaken = await prisma.user.findUnique({
        where: { telegramId: tgId },
        select: { id: true },
      });
      if (tgTaken) {
        return NextResponse.json(
          { ok: false, error: "Telegram ID already linked to another account." },
          { status: 409 },
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        name: name.trim(),
        username: lower,
        passwordHash,
        telegramId: tgId,
        year: "3",
        status: "active",
        role: "admin",
      },
      select: { id: true, name: true, username: true, telegramId: true, createdAt: true },
    });

    return NextResponse.json(
      { ok: true, admin },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}