import { NextResponse } from "next/server";

import { TELEGRAM_CLIENT_ID, oidcClientSecret } from "@/lib/config";
import {
  buildAuthorizationUrl,
  generateCodeVerifier,
  generateNonce,
  generateState,
  oidcCallbackUrl,
  s256Challenge,
} from "@/lib/oidc";

const COOKIE_MAX_AGE = 10 * 60;

/**
 * Starts the Telegram OIDC authorization code flow. Generates and pins the
 * CSRF `state`, PKCE `code_verifier`, and anti-replay `nonce` as httpOnly,
 * SameSite=Lax cookies (read back by the callback route), then returns the
 * official oauth.telegram.org authorization URL for the browser to follow.
 */
export async function GET(request: Request) {
  const clientSecret = oidcClientSecret();
  if (!clientSecret) {
    console.error(
      "[oidc/init] TELEGRAM_CLIENT_SECRET is not configured — OIDC login cannot start.",
    );
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const localeMatch = url.pathname.match(/^\/(en|ar)\//);
  const locale = localeMatch?.[1] ?? "ar";

  const state = generateState();
  const nonce = generateNonce();
  const codeVerifier = generateCodeVerifier();

  const redirectUri = oidcCallbackUrl();
  if (!redirectUri.startsWith("https://") && !redirectUri.startsWith("http://")) {
    return NextResponse.json(
      { ok: false, error: "invalid_request" },
      { status: 500 },
    );
  }

  const reqUrl = buildAuthorizationUrl({
    clientId: TELEGRAM_CLIENT_ID,
    redirectUri,
    state,
    nonce,
    codeChallenge: s256Challenge(codeVerifier),
    locale,
  });

  const res = NextResponse.json({ ok: true, url: reqUrl });
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: redirectUri.startsWith("https://"),
    maxAge: COOKIE_MAX_AGE,
  };
  res.cookies.set("tg_oidc_state", state, common);
  res.cookies.set("tg_oidc_nonce", nonce, common);
  res.cookies.set("tg_oidc_verifier", codeVerifier, common);
  return res;
}