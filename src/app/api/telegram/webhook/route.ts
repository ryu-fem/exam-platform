import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sendTelegramMessage, getAppUrl, escapeHtml } from "@/lib/telegram";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "@/lib/locale";

/**
 * Telegram bot webhook. Handles the /start command and forwards new-user
 * notifications so admins see them in the chat.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: {
    message?: {
      chat?: { id?: number };
      from?: { id?: number; first_name?: string };
      text?: string;
    };
  } = {};
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const chatId = update.message?.chat?.id
    ?? update.message?.from?.id;
  if (!chatId) {
    // Acknowledge silently — nothing actionable in this update.
    return NextResponse.json({ ok: true });
  }

  const text = (update.message?.text ?? "").trim();

  if (text === "/start" || text.startsWith("/start ")) {
    const appUrl = getAppUrl();

    // The widget's `id` equals the chat id, so a matching user is already
    // registered with this Telegram account.
    const registered = await prisma.user.findUnique({
      where: { telegramId: String(chatId) },
      select: { name: true, username: true },
    });

    if (registered) {
      await sendTelegramMessage(
        chatId,
        `أهلاً ${escapeHtml(registered.name)}! 👋\n` +
          `يمكنك الدخول من: ${appUrl}/${DEFAULT_LOCALE}/login`,
      );
    } else {
      await sendTelegramMessage(
        chatId,
        `أهلاً بك في منصة الاختبارات! 🎓\n` +
          `سجل من الموقع: ${appUrl}/${DEFAULT_LOCALE}/register`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}