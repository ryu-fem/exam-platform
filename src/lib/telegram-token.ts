import { timingSafeEqual, createHmac } from "crypto";

const TOKEN_TTL_SECONDS = 15 * 60;

export type OnboardingTokenPayload = {
  telegramId: string;
  photoUrl?: string | null;
  name?: string | null;
  username?: string | null;
  exp: number;
};

function signMessage(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Signs a short-lived onboarding token. The payload (telegramId, photoUrl,
 * telegram profile) is encoded base64url and HMAC-SHA256 signed with
 * NEXTAUTH_SECRET so the client can never tamper with which Telegram id ends
 * up locked to the new account.
 */
export function signOnboardingToken(
  payload: Omit<OnboardingTokenPayload, "exp">,
  secret: string,
): string {
  if (!secret) throw new Error("Missing NEXTAUTH_SECRET.");
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }),
  ).toString("base64url");
  return `${body}.${signMessage(body, secret)}`;
}

/**
 * Verifies the token signature and expiry and returns the locked payload, or
 * null when the token is invalid/expired/tampered.
 */
export function verifyOnboardingToken(
  token: string | null | undefined,
  secret: string,
): Omit<OnboardingTokenPayload, "exp"> | null {
  if (!token || !secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  const expected = signMessage(body, secret);
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature);
  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null;
  }

  let payload: OnboardingTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString()) as OnboardingTokenPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp <= now) return null;
  if (typeof payload.telegramId !== "string" || !payload.telegramId) return null;

  return {
    telegramId: payload.telegramId,
    photoUrl: payload.photoUrl ?? null,
    name: payload.name ?? null,
    username: payload.username ?? null,
  };
}