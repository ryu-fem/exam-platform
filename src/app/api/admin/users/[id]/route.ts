import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendTelegramMessage, getAppUrl, escapeHtml } from "@/lib/telegram";
import { DEFAULT_LOCALE } from "@/lib/locale";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const body = await req.json();
    const action = String(body.action ?? "");
    const reason = String(body.reason ?? "").trim();

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    if (action === "reject" && reason.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Please provide a rejection reason." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const newStatus = action === "approve" ? "active" : "rejected";

    await prisma.user.update({
      where: { id: user.id },
      data: { status: newStatus },
    });

    await prisma.verification.update({
      where: { userId: user.id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        rejectionReason: action === "reject" ? reason : null,
      },
    });

    const name = escapeHtml(user.name);
    const appUrl = getAppUrl();
    const chatId = user.telegramId;

    if (action === "approve") {
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          `🎉 <b>Congratulations, ${name}!</b>\n\nYour account has been <b>approved</b>. You can now log in and start using the platform.\n\n<a href="${appUrl}/${DEFAULT_LOCALE}/login">Log in now</a>`,
        );
      }
    } else {
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          `❌ <b>Hello ${name},</b>\n\nUnfortunately, your verification was <b>rejected</b>.\n\n<b>Reason:</b> ${escapeHtml(reason)}\n\nPlease fix the issue and resubmit proof of membership.\n\n<a href="${appUrl}/${DEFAULT_LOCALE}/verify">Resubmit verification</a>`,
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}