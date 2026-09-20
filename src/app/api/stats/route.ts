import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getUserStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getUserStats(session.user.id);

  return NextResponse.json(
    { ...stats },
    { headers: { "Cache-Control": "no-store" } },
  );
}