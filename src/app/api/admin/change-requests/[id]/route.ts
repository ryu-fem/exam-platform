import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  notifyModificationApproved,
  notifyModificationRejected,
} from "@/lib/telegram-notify";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(1000).optional(),
});

function bilingualAccountMessage(
  field: string,
  action: "approved" | "rejected",
): { title: string; message: string } {
  const fieldNice = field === "password" ? "password" : field;
  if (action === "approved") {
    return {
      title: "تمت الموافقة على تعديل حسابك | Your account change was approved",
      message: `تم اعتماد تعديل «${fieldNice}».\n` + `Your «${fieldNice}» change was approved.`,
    };
  }
  return {
    title: "تم رفض تعديل حسابك | Your account change was rejected",
    message: `لم يتم اعتماد تعديل «${fieldNice}».\n` + `Your «${fieldNice}» change was not approved.`,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid action" },
        { status: 400 },
      );
    }
    const { action, note } = parsed.data;

    const request = await prisma.accountChangeRequest.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!request) {
      return NextResponse.json(
        { ok: false, error: "Request not found" },
        { status: 404 },
      );
    }
    if (request.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "Request already reviewed" },
        { status: 409 },
      );
    }

    const notice = bilingualAccountMessage(
      request.field,
      action === "approve" ? "approved" : "rejected",
    );

    if (action === "reject") {
      await prisma.accountChangeRequest.update({
        where: { id },
        data: {
          status: "rejected",
          adminId: session.user.id,
          reviewedAt: new Date(),
        },
      });
      await prisma.notification.create({
        data: {
          userId: request.userId,
          type: "account",
          title: notice.title,
          message: note?.trim()
            ? `${notice.message}\n${note.trim()}`
            : notice.message,
          link: "/settings",
        },
      });
      await notifyModificationRejected(
        request.user.telegramId,
        request.field,
        note?.trim() || "not approved",
      );
      return NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (request.field === "username") {
      const taken = await prisma.user.findUnique({
        where: { username: request.newValue },
      });
      if (taken) {
        return NextResponse.json(
          { ok: false, error: "This username is already taken" },
          { status: 409 },
        );
      }
    }

    const data: Record<string, unknown> =
      request.field === "password"
        ? { passwordHash: request.newValue }
        : { [request.field]: request.newValue };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.userId },
        data,
      }),
      prisma.accountChangeRequest.update({
        where: { id },
        data: {
          status: "approved",
          adminId: session.user.id,
          reviewedAt: new Date(),
        },
      }),
      prisma.notification.create({
        data: {
          userId: request.userId,
          type: "account",
          title: notice.title,
          message: notice.message,
          link: "/settings",
        },
      }),
    ]);

    await notifyModificationApproved(
      request.user.telegramId,
      request.field,
      request.newValue,
    );

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to review request" },
      { status: 500 },
    );
  }
}