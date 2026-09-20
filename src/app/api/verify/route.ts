import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notifyAdmin, escapeHtml, sendTelegramMessage, getAppUrl } from "@/lib/telegram";
import { DEFAULT_LOCALE } from "@/lib/locale";

const MAX_SIZE = 8 * 1024 * 1024;

function isBase64DataUrl(value: string) {
  return /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json();
    const channelScreenshot = String(body.channelScreenshot ?? "");
    const groupScreenshot = String(body.groupScreenshot ?? "");

    if (!isBase64DataUrl(channelScreenshot) || !isBase64DataUrl(groupScreenshot)) {
      return NextResponse.json(
        { ok: false, error: "Please upload valid screenshots (PNG, JPEG or WebP)." },
        { status: 400 },
      );
    }

    if (channelScreenshot.length > MAX_SIZE || groupScreenshot.length > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: "Each screenshot must be smaller than 8MB." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }

    await prisma.verification.upsert({
      where: { userId: user.id },
      update: {
        channelScreenshot,
        groupScreenshot,
        status: "pending",
        rejectionReason: null,
      },
      create: {
        userId: user.id,
        channelScreenshot,
        groupScreenshot,
        status: "pending",
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { status: "pending" },
    });

    const name = escapeHtml(user.name);
    const username = escapeHtml(user.username);
    await notifyAdmin(
      `🎓 <b>New verification submitted</b>\n\n` +
        `👤 Name: <b>${name}</b>\n` +
        `🆔 Username: @${username}\n` +
        `📅 Year: ${user.year}\n` +
        `🏛 System: ${user.system ?? "-"}\n` +
        `🎯 Track: ${user.track ?? "-"}\n` +
        `📚 Elective: ${user.electiveSubject ?? "-"}\n\n` +
        `Review it in the <a href="${process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? ""}/${DEFAULT_LOCALE}/admin">admin panel</a>.`,
    );

    if (user.telegramId) {
      sendTelegramMessage(
        user.telegramId,
        `You can check your status here: ${getAppUrl()}/${DEFAULT_LOCALE}/pending`,
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}