import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Session endpoint. Must always return valid JSON with a 200 status.
 *
 * Returning a bare `null` body breaks NextAuth's client, which runs
 * `Object.keys(data)` on the parsed response and throws
 * "can't convert null to object". We therefore fall back to `{}` for an
 * empty session (which the client treats as no session).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    return NextResponse.json(session ?? {});
  } catch {
    return NextResponse.json({});
  }
}
