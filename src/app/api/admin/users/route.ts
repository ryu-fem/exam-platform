import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const status = req.nextUrl.searchParams.get("status") ?? "pending";
    const search = req.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";

    const users = await prisma.user.findMany({
      where: {
        status,
        role: "student",
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: { verification: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, users });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load users" }, { status: 500 });
  }
}