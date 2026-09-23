import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sendTelegramMessage, getAppUrl } from "@/lib/telegram";

/**
 * Telegram bot webhook — the ONLY place that processes bot updates.
 * Registered via Telegram's setWebhook API pointing at /api/telegram/webhook.
 *
 * Handles /start by replying with a short Arabic welcome that directs the
 * user to the website's registration page. It intentionally does NOT include
 * a magic-link URL with a bare telegramId query param (the insecure mechanism
 * of the removed bot.cjs deep-link flow). Real authentication happens through
 * the official Telegram Login Widget on the website.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: {
    message?: {
      chat?: { id?: number };
      text?: string;
    };
  } = {};
  try {
    update = await req.json();
  } catch {
    // Unparseable update — acknowledge so Telegram stops retrying.
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  if (chatId) {
    const text = (update.message?.text ?? "").trim();
    if (text === "/start" || text.startsWith("/start ")) {
      const registerUrl = `${getAppUrl()}/ar/register`;
      try {
        await sendTelegramMessage(
          chatId,
          `أهلاً بك في منصة الاختبارات! 🎓\n` +
            `للتسجيل في حساب جديد، تفضل عبر الموقع:\n${registerUrl}`,
        );
      } catch (error) {
        console.error("[telegram/webhook] sendMessage failed:", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}