import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTelegramAuth } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body as Record<string, string>;

    const telegramId = query.id;
    if (!telegramId || !verifyTelegramAuth(query)) {
      return NextResponse.json(
        { ok: false, error: "Telegram authentication failed. Please try again." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) },
      include: { verification: true },
    });

    if (existing) {
      let target = "/dashboard";
      if (existing.role === "admin") {
        target = "/admin";
      } else if (existing.status === "pending" && !existing.verification) {
        target = "/verify";
      } else if (existing.status === "pending" && existing.verification) {
        target = "/pending";
      } else if (existing.status === "rejected") {
        target = "/verify";
      }

      if (existing.status === "active" || existing.role === "admin") {
        return NextResponse.json({
          ok: true,
          action: "signin",
          telegramId: String(telegramId),
          target,
        });
      }

      return NextResponse.json({
        ok: true,
        action: "redirect",
        target,
      });
    }

    const first_name = query.first_name ?? "Student";
    const fallbackUsername = `tg_${telegramId}`;

    await prisma.user.upsert({
      where: { telegramId: String(telegramId) },
      update: {},
      create: {
        telegramId: String(telegramId),
        username: fallbackUsername,
        name: first_name,
        year: "1",
        system: "general",
        status: "pending",
        role: "student",
      },
    });

    return NextResponse.json({
      ok: true,
      action: "onboarding",
      telegramId: String(telegramId),
      target: `/onboarding?telegramId=${encodeURIComponent(String(telegramId))}`,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}