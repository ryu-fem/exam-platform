import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.accountChangeRequest.findMany({
      where: { status: "pending" },
      include: {
        user: { select: { id: true, username: true, name: true, year: true, system: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      { ok: true, requests },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to load change requests" },
      { status: 500 },
    );
  }
}