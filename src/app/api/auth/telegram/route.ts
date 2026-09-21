import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTelegramAuth } from "@/lib/telegram";

function buildOnboardingTarget(
  telegramId: string,
  profile: { name?: string; username?: string; photoUrl?: string },
) {
  const params = new URLSearchParams({ telegramId });
  if (profile.name) params.set("name", profile.name);
  if (profile.username) params.set("tgUsername", profile.username);
  if (profile.photoUrl) params.set("photoUrl", profile.photoUrl);
  return `/onboarding?${params.toString()}`;
}

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

    // Returning user — sign in through the Telegram provider so a session is
    // restored and requireStudentUser can route them correctly.
    if (existing) {
      let target = "/dashboard";
      let action: "signin" | "onboarding" = "signin";

      if (existing.role === "admin") {
        target = "/admin";
      } else if (existing.status === "active") {
        target = "/dashboard";
      } else if (existing.status === "rejected") {
        target = "/verify";
      } else if (existing.verification) {
        target = "/pending";
      } else if (existing.passwordHash) {
        // Completed onboarding but never uploaded verification screenshots.
        target = "/verify";
      } else {
        // Legacy shell record created before onboarding was finished.
        action = "onboarding";
        target = buildOnboardingTarget(String(telegramId), {
          name: existing.name || undefined,
        });
      }

      return NextResponse.json({
        ok: true,
        action,
        telegramId: String(telegramId),
        target,
      });
    }

    // Brand new user — no DB record is created yet. The onboarding form
    // receives the Telegram profile so the name can be pre-filled.
    return NextResponse.json({
      ok: true,
      action: "onboarding",
      telegramId: String(telegramId),
      target: buildOnboardingTarget(String(telegramId), {
        name: query.first_name,
        username: query.username,
        photoUrl: query.photo_url,
      }),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}