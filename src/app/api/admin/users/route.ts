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

    const params = req.nextUrl.searchParams;
    const status = params.get("status") ?? "all";
    const year = params.get("year") ?? "";
    const track = params.get("track") ?? "";
    const search = params.get("q")?.trim() ?? "";

    const users = await prisma.user.findMany({
      where: {
        role: "student",
        ...(status && status !== "all" ? { status } : {}),
        ...(year ? { year } : {}),
        ...(track ? { track } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { username: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: { verification: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(
      { ok: true, users },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load users" }, { status: 500 });
  }
}