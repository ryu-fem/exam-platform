import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BACCALAUREATE_ELECTIVES,
  BACCALAUREATE_TRACKS,
  SECTIONS,
  SYSTEMS,
  YEARS,
} from "@/lib/curriculum";

const VALUE_SETS: Record<string, Set<string>> = {
  year: new Set(YEARS.map((y) => y.value)),
  system: new Set(
    Object.values(SYSTEMS)
      .flat()
      .map((s) => s.value),
  ),
  section: new Set(
    Object.values(SECTIONS)
      .flat()
      .map((s) => s.value),
  ),
  track: new Set(BACCALAUREATE_TRACKS.map((t) => t.value)),
  electiveSubject: new Set(
    Object.values(BACCALAUREATE_ELECTIVES)
      .flat()
      .map((e) => e.value),
  ),
};

const avatarSchema = z.string().refine((value) => {
  if (value.startsWith("http://") || value.startsWith("https://")) return true;
  const isImageData =
    value.startsWith("data:image/png;base64,") ||
    value.startsWith("data:image/jpeg;base64,") ||
    value.startsWith("data:image/webp;base64,") ||
    value.startsWith("data:image/gif;base64,");
  return isImageData && value.length <= 400_000;
});

function buildSchema() {
  return z
    .object({
      field: z.enum([
        "name",
        "username",
        "password",
        "year",
        "system",
        "section",
        "track",
        "electiveSubject",
        "avatarUrl",
      ]),
      newValue: z.string().max(400_000),
      note: z.string().max(500).optional(),
    })
    .superRefine((data, ctx) => {
      const raw = data.newValue.trim();
      switch (data.field) {
        case "name":
          if (raw.length < 2 || raw.length > 80) {
            ctx.addIssue({ code: "custom", message: "invalidName" });
          }
          break;
        case "username": {
          if (!/^[a-zA-Z0-9_]{3,20}$/.test(raw)) {
            ctx.addIssue({ code: "custom", message: "invalidUsername" });
          }
          break;
        }
        case "password":
          if (raw.length < 6 || raw.length > 128) {
            ctx.addIssue({ code: "custom", message: "invalidPassword" });
          }
          break;
        case "avatarUrl":
          if (!avatarSchema.safeParse(raw).success) {
            ctx.addIssue({ code: "custom", message: "invalidAvatar" });
          }
          break;
        default: {
          const set = VALUE_SETS[data.field as keyof typeof VALUE_SETS];
          if (!set?.has(raw)) {
            ctx.addIssue({ code: "custom", message: "invalidFieldValue" });
          }
        }
      }
    });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.accountChangeRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json(
      { ok: true, requests },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to load requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const parsed = buildSchema().safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { ok: false, error: issue?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const { field, note } = parsed.data;
    const newValue = parsed.data.newValue.trim();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const currentValue =
      (user as unknown as Record<string, unknown>)[
        field === "password" ? "passwordHash" : field
      ];

    if (
      typeof currentValue === "string" &&
      field !== "password" &&
      currentValue === newValue
    ) {
      return NextResponse.json({ ok: false, error: "noChange" }, { status: 400 });
    }

    const pending = await prisma.accountChangeRequest.findFirst({
      where: { userId: user.id, field, status: "pending" },
    });
    if (pending) {
      return NextResponse.json({ ok: false, error: "dupRequest" }, { status: 409 });
    }

    if (field === "username" && newValue !== user.username) {
      const taken = await prisma.user.findUnique({
        where: { username: newValue },
      });
      if (taken) {
        return NextResponse.json({ ok: false, error: "usernameTaken" }, { status: 409 });
      }
    }

    let valueToStore = newValue;
    if (field === "password") {
      valueToStore = await bcrypt.hash(newValue, 10);
    }

    const request = await prisma.accountChangeRequest.create({
      data: {
        userId: user.id,
        field,
        currentValue:
          typeof currentValue === "string" && currentValue.length && field !== "password"
            ? currentValue
            : null,
        newValue: valueToStore,
        note: note?.trim() || undefined,
      },
    });

    return NextResponse.json(
      { ok: true, request },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to submit request" }, { status: 500 });
  }
}