import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  username: z.string().trim().min(1).max(30),
});

/**
 * Used by the onboarding form to check username uniqueness as the user types.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    username: searchParams.get("username") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: true, available: true, taken: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const username = parsed.data.username;

  try {
    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    return NextResponse.json(
      { ok: true, available: !existing, taken: Boolean(existing) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("username-check error:", error);
    // Fail open: let the server-side uniqueness check in /api/onboarding win.
    return NextResponse.json(
      { ok: false, available: true, taken: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}