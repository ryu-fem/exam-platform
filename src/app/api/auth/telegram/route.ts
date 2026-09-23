import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTelegramAuthDetailed } from "@/lib/telegram";
import { signOnboardingToken } from "@/lib/telegram-token";

const secret = process.env.NEXTAUTH_SECRET ?? "";
const tokenBotId = process.env.TELEGRAM_BOT_TOKEN?.split(":")[0] ?? "";
const clientBotId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID?.trim() ?? "";

// Surface configuration drift: the widget signs payloads with the real bot
// token, but the popup opens against NEXT_PUBLIC_TELEGRAM_BOT_ID. If those two
// refer to different bots, every login fails exactly like "registration never
// proceeds". Log it loudly server-side (never log the token itself).
if (
  tokenBotId &&
  clientBotId &&
  tokenBotId !== clientBotId &&
  process.env.NODE_ENV !== "production"
) {
  console.error(
    "[telegram] Bot id mismatch: TELEGRAM_BOT_TOKEN belongs to bot",
    tokenBotId,
    "but NEXT_PUBLIC_TELEGRAM_BOT_ID is",
    clientBotId,
    "— the Login popup and hash verification will disagree.",
  );
}
if (!secret) {
  console.error("[telegram] NEXTAUTH_SECRET is not set — onboarding tokens disabled.");
}

type TelegramProfile = {
  name?: string;
  username?: string;
  photoUrl?: string;
};

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 },
      );
    }

    const query = body as Record<string, string>;
    const telegramId = query.id;

    const verdict = telegramId
      ? verifyTelegramAuthDetailed(query)
      : { ok: false, reason: "missing 'id' field" };

    if (!verdict.ok) {
      console.error(
        "[telegram] Auth rejected for id",
        String(telegramId ?? "(missing)"),
        "—",
        verdict.reason,
      );
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
        // Legacy shell record created before onboarding was finished — resume
        // the onboarding wizard with a fresh signed token.
        action = "onboarding";
        return OnboardingResponse(String(telegramId), {
          name: existing.name || undefined,
          username: query.username,
          photoUrl: query.photo_url,
        });
      }

      return NextResponse.json({
        ok: true,
        action,
        telegramId: String(telegramId),
        target,
      });
    }

    // Brand new user — no DB record is created yet. The wizard receives a
    // short-lived signed token (held in sessionStorage) plus the Telegram
    // profile for pre-filling the form; nothing sensitive travels in the URL.
    return OnboardingResponse(String(telegramId), {
      name: query.first_name,
      username: query.username,
      photoUrl: query.photo_url,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

function OnboardingResponse(telegramId: string, profile: TelegramProfile) {
  const token = signOnboardingToken({ telegramId, ...profile });
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "Server misconfiguration: NEXTAUTH_SECRET is not set.",
      },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    action: "onboarding",
    token,
    profile: {
      name: profile.name ?? "",
      username: profile.username ?? "",
      photoUrl: profile.photoUrl ?? "",
    },
  });
}