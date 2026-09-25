import { NextResponse } from "next/server";

import { encode } from "next-auth/jwt";

import { prisma } from "@/lib/prisma";
import { TELEGRAM_CLIENT_ID, oidcClientSecret } from "@/lib/config";
import {
  exchangeAuthorizationCode,
  oidcCallbackUrl,
  verifyIdToken,
} from "@/lib/oidc";
import { signOnboardingToken } from "@/lib/telegram-token";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

function redirect(location: string, baseUrl: string) {
  return NextResponse.redirect(new URL(location, baseUrl).toString(), {
    status: 302,
  });
}

/**
 * The OIDC redirect_uri handler. Telegram redirects the browser here with an
 * authorization `code`; we:
 *  1. validate the CSRF `state` cookie issued by /oidc/init,
 *  2. exchange the code (Basic auth + PKCE) for an RS256-signed id_token,
 *  3. verify the token (issuer, audience, signature, expiry, nonce),
 *  4. bridge the verified Telegram profile into the existing account model:
 *       - new users  → mint the 15-min onboarding token → /register
 *       - known users → sign the NextAuth JWT session server-side and go in
 *         (PENDING signs in as read-only guest; only rejected is blocked).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const baseUrl = process.env.APP_URL ?? url.origin;

  const clientSecret = oidcClientSecret();
  if (!clientSecret) {
    return redirect("/login?error=telegram_not_configured", baseUrl);
  }

  const error = params.get("error");
  if (error) {
    console.error("[oidc/callback] Telegram returned an error:", error);
    return redirect("/login?error=telegram_denied", baseUrl);
  }

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) {
    return redirect("/login?error=telegram_incomplete", baseUrl);
  }

  const anyCookies = await import("next/headers");
  const cookieStore = await anyCookies.cookies();

  const expectedState = cookieStore.get("tg_oidc_state")?.value ?? null;
  const nonce = cookieStore.get("tg_oidc_nonce")?.value ?? null;
  const codeVerifier = cookieStore.get("tg_oidc_verifier")?.value ?? null;

  cookieStore.set("tg_oidc_state", "", { maxAge: 0, path: "/" });
  cookieStore.set("tg_oidc_nonce", "", { maxAge: 0, path: "/" });
  cookieStore.set("tg_oidc_verifier", "", { maxAge: 0, path: "/" });

  if (!expectedState || expectedState !== state) {
    console.error("[oidc/callback] CSRF state mismatch.");
    return redirect("/login?error=telegram_denied", baseUrl);
  }
  if (!nonce || !codeVerifier) {
    console.error("[oidc/callback] Missing nonce or PKCE verifier cookie.");
    return redirect("/login?error=telegram_denied", baseUrl);
  }

  try {
    const redirectUri = oidcCallbackUrl();
    const idToken = await exchangeAuthorizationCode({
      code,
      redirectUri,
      codeVerifier,
      clientId: TELEGRAM_CLIENT_ID,
      clientSecret,
    });

    const profile = await verifyIdToken({
      idToken,
      clientId: TELEGRAM_CLIENT_ID,
      expectedNonce: nonce,
    });

    const user = await prisma.user.findUnique({
      where: { telegramId: profile.telegramId },
      include: { verification: true },
    });

    if (!user) {
      // First-time Telegram user → the same signed onboarding token the widget
      // flow used, passed to the registration wizard which persists + resumes.
      const token = signOnboardingToken(
        {
          telegramId: profile.telegramId,
          photoUrl: profile.photoUrl,
          name: profile.name,
          username: profile.username,
        },
        process.env.NEXTAUTH_SECRET ?? "",
      );
      const query = new URLSearchParams({
        telegram_oidc: "1",
        token,
        name: profile.name,
        username: profile.username,
        photo: profile.photoUrl ?? "",
      });
      return redirect(`/register?${query.toString()}`, baseUrl);
    }

    if (user.status === "rejected" && user.role !== "admin") {
      return redirect("/verify", baseUrl);
    }

    // PENDING stays a read-only guest (can browse) — same as credentials login.
    const jwt = await encode({
      token: {
        sub: user.id,
        name: user.name,
        id: user.id,
        telegramId: user.telegramId ?? undefined,
        role: user.role,
        status: user.status,
        year: user.year,
        system: user.system ?? undefined,
        track: user.track ?? undefined,
        electiveSubject: user.electiveSubject ?? undefined,
      },
      secret: process.env.NEXTAUTH_SECRET ?? "",
      maxAge: SESSION_MAX_AGE,
    });

    const isHttps = redirectUri.startsWith("https://");
    const cookieName = isHttps
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";
    const target = user.role === "admin" ? "/admin" : "/dashboard";

    const res = NextResponse.redirect(new URL(target, baseUrl).toString(), {
      status: 302,
    });
    res.cookies.set(cookieName, jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[oidc/callback] failed:", err);
    return redirect("/login?error=telegram_failed", baseUrl);
  }
}