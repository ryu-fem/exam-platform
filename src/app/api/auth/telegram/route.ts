import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  verifyTelegramAuth,
  type TelegramAuthData,
  type TelegramAuthErrorReason,
} from "@/lib/telegram";
import { signOnboardingToken } from "@/lib/telegram-token";
import { TELEGRAM_BOT_USERNAME, finalBotIdNumber } from "@/lib/config";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "";
const BOT_TOKEN_ID = BOT_TOKEN.split(":")[0] ?? "";

/**
 * Receives the raw Telegram Login Widget payload on the server and:
 *  1. re-verifies the HMAC signature (the client is untrusted),
 *  2. rejects stale `auth_date` payloads and bot accounts,
 *  3. for first-time users mints a short-lived, signed onboarding token that
 *     only /api/onboarding can consume — the telegramId/photoUrl inside it
 *     are locked server-side and never accepted from the request body.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as TelegramAuthData | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid request." },
        { status: 400 },
      );
    }

    const verification = verifyTelegramAuth(body, BOT_TOKEN);
    if (!verification.ok) {
      // Detailed server-side diagnostics: read the Vercel logs to confirm the
      // verifier bot (TELEGRAM_BOT_TOKEN's numeric id) matches the bot that
      // rendered the widget. A mismatch here is a bot-token pairing problem,
      // not a code bug.
      console.error("[api/auth/telegram] verification failed", {
        reason: verification.reason as TelegramAuthErrorReason,
        detail: verification.error,
        widgetBotUsername: TELEGRAM_BOT_USERNAME,
        widgetBotId: finalBotIdNumber(),
        verifierBotTokenId: BOT_TOKEN_ID || null,
        verifierTokenConfigured: BOT_TOKEN.length > 0,
        telegramId: String(body.id ?? ""),
        authDate: body.auth_date ?? null,
      });
      return NextResponse.json(
        { ok: false, error: "Telegram verification failed." },
        { status: 401 },
      );
    }

    const telegramId = String(body.id ?? "");
    const numericId = Number(telegramId);
    if (!/^\d{6,17}$/.test(telegramId) || !Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid Telegram account id." },
        { status: 401 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { telegramId },
      include: { verification: true },
    });

    if (!existing) {
      const token = signOnboardingToken(
        {
          telegramId,
          photoUrl: typeof body.photo_url === "string" ? body.photo_url : null,
          name: body.first_name ?? "",
          username: body.username ?? "",
        },
        NEXTAUTH_SECRET,
      );
      return NextResponse.json({
        ok: true,
        action: "onboarding",
        token,
        telegramId,
        profile: {
          name: body.first_name ?? "",
          username: body.username ?? "",
          photoUrl: typeof body.photo_url === "string" ? body.photo_url : null,
        },
      });
    }

    if (existing.role === "admin") {
      return NextResponse.json({ ok: true, action: "redirect", target: "/admin", telegramId });
    }
    if (existing.status === "active") {
      return NextResponse.json({ ok: true, action: "signin", telegramId });
    }
    if (existing.status === "pending") {
      // PENDING is a read-only guest mode: let them straight into the
      // dashboard where a banner explains the restriction.
      return NextResponse.json({
        ok: true,
        action: "redirect",
        target: "/dashboard",
        telegramId,
      });
    }
    if (existing.status === "rejected") {
      return NextResponse.json({ ok: true, action: "redirect", target: "/verify", telegramId });
    }

    return NextResponse.json(
      { ok: false, error: "This account cannot sign in." },
      { status: 403 },
    );
  } catch (error) {
    console.error("[api/auth/telegram] failed:", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}