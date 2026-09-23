import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET ?? "";

export interface OnboardingTokenPayload {
  telegramId: string;
  name?: string;
  username?: string;
  photoUrl?: string;
  iat: number;
  exp: number;
}

export const ONBOARDING_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * Issue a short-lived signed token that proves the holder already completed a
 * Telegram Login Widget verification. Carries the Telegram profile so the
 * onboarding form can prefill it without trusting query-string/body values.
 * Returns null when the app is misconfigured (missing NEXTAUTH_SECRET).
 */
export function signOnboardingToken(data: {
  telegramId: string;
  name?: string;
  username?: string;
  photoUrl?: string;
}): string | null {
  if (!SECRET) return null;

  const now = Date.now();
  const payload: OnboardingTokenPayload = {
    telegramId: data.telegramId,
    ...(data.name ? { name: data.name } : {}),
    ...(data.username ? { username: data.username } : {}),
    ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
    iat: now,
    exp: now + ONBOARDING_TOKEN_TTL_MS,
  };

  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

/**
 * Verify and decode an onboarding token. Returns null when the signature is
 * invalid/tampered, the token is malformed, or it has expired.
 */
export function verifyOnboardingToken(
  token: string,
): OnboardingTokenPayload | null {
  if (!SECRET) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload: OnboardingTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as OnboardingTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof payload.telegramId !== "string" ||
    typeof payload.exp !== "number" ||
    !Number.isFinite(payload.exp)
  ) {
    return null;
  }

  if (payload.exp < Date.now()) return null;

  return payload;
}