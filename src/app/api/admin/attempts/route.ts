import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("q")?.trim() ?? "";

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        ...(status && status !== "all" ? { status } : {}),
        ...(search
          ? {
              OR: [
                { user: { name: { contains: search, mode: "insensitive" } } },
                { user: { username: { contains: search, mode: "insensitive" } } },
                { quiz: { title: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { submittedAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, username: true, year: true } },
        quiz: {
          select: {
            id: true,
            title: true,
            subject: true,
            xpReward: true,
            questionCount: true,
            _count: { select: { questions: true } },
          },
        },
      },
    });

    return NextResponse.json(
      { ok: true, attempts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load attempts." },
      { status: 500 },
    );
  }
}