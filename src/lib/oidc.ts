import { createHash, randomBytes } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Telegram's official OpenID Connect endpoints (core.telegram.org/widgets/login):
 * authorization code + PKCE at oauth.telegram.org, token exchange with Basic
 * auth (client_id:client_secret), and RS256-signed id_tokens published on the
 * standard JWKS URI. This eliminates the legacy widget's third-party iframe and
 * its cookie dependency entirely.
 */
export const TELEGRAM_OIDC_ISSUER = "https://oauth.telegram.org";
export const TELEGRAM_AUTH_ENDPOINT = "https://oauth.telegram.org/auth";
export const TELEGRAM_TOKEN_ENDPOINT = "https://oauth.telegram.org/token";
export const TELEGRAM_JWKS_URI =
  "https://oauth.telegram.org/.well-known/jwks.json";

/** Same value in the init route and the callback (= the redirect_uri). */
export function oidcCallbackUrl(): string {
  return `${process.env.APP_URL ?? ""}/api/telegram/oidc/callback`;
}

export function generateState(): string {
  return randomBytes(16).toString("base64url");
}

export function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** S256 PKCE challenge from a plain code_verifier. */
export function s256Challenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

/**
 * Builds the user-facing OIDC authorization URL. `nonce` and `code_challenge`
 * are included so the returned id_token can be verified for replay/PKCE on the
 * callback side.
 */
export function buildAuthorizationUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  locale: string;
}): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: "openid profile",
    state: options.state,
    nonce: options.nonce,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
  });
  if (options.locale.startsWith("ar")) {
    params.set("lang", "ar");
  }
  return `${TELEGRAM_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges the authorization code for the id_token at the token endpoint.
 * Uses HTTP Basic auth with the bot's Client ID / Client Secret from BotFather.
 */
export async function exchangeAuthorizationCode(options: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  // Helpful outbound log so the exact request Telegram rejected can be compared
  // against what it expects. Never logs the client_secret or the code itself.
  console.error(
    `[oidc/token] request client_id=${options.clientId} redirect_uri=${options.redirectUri} ` +
      `grant_type=authorization_code code_verifier_present=${options.codeVerifier.length > 0}`,
  );

  const basic = Buffer.from(
    `${options.clientId}:${options.clientSecret}`,
  ).toString("base64");

  // Standard OAuth2 token body (RFC 6749 §4.1.3). Sent URL-encoded — NOT JSON.
  // client_id is included as a form parameter (Telegram's endpoint reports
  // "client_id and redirect_uri required" when it is only in the Basic auth
  // header); redirect_uri must match the authorization request byte-for-byte.
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: options.code,
    redirect_uri: options.redirectUri,
    client_id: options.clientId,
    code_verifier: options.codeVerifier,
  });

  const res = await fetch(TELEGRAM_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  // Read the raw text first: Telegram may answer with a non-JSON body, and
  // `res.json()` would crash on JSON.parse before we ever see what it sent.
  const rawText = await res.text();

  if (!res.ok) {
    console.error(`[oidc/token] status=${res.status} body=${rawText}`);
    throw new Error(`Telegram token exchange failed with ${res.status}`);
  }

  let json: { id_token?: string; error?: string } | null = null;
  try {
    json = JSON.parse(rawText) as { id_token?: string; error?: string };
  } catch {
    console.error(`[oidc/token] status=${res.status} body=${rawText}`);
    throw new Error(
      `Telegram token exchange returned invalid JSON (status ${res.status}).`,
    );
  }

  if (!json.id_token) {
    console.error(`[oidc/token] status=${res.status} body=${rawText}`);
    throw new Error("Telegram token response contained no id_token.");
  }
  return json.id_token;
}

export type OidcProfile = {
  telegramId: string;
  name: string;
  username: string;
  photoUrl: string | null;
};

/**
 * Verifies the RS256-signed id_token against Telegram's published JWKS and
 * extracts the student profile claims. Enforces issuer, audience (our client
 * id), signature and expiry (jwtVerify) plus the anti-replay nonce that was
 * issued at the start of this authorization.
 */
export async function verifyIdToken(options: {
  idToken: string;
  clientId: string;
  expectedNonce?: string;
}): Promise<OidcProfile> {
  const jwks = createRemoteJWKSet(new URL(TELEGRAM_JWKS_URI));
  const { payload } = await jwtVerify(options.idToken, jwks, {
    issuer: TELEGRAM_OIDC_ISSUER,
    audience: options.clientId,
  });

  const claims = payload as typeof payload & {
    id?: unknown;
    given_name?: unknown;
    family_name?: unknown;
    preferred_username?: unknown;
    picture?: unknown;
  };

  if (!claims.id || (typeof claims.id !== "string" && typeof claims.id !== "number")) {
    console.error("[oidc/callback] id_token has no Telegram account 'id' claim.");
    throw new Error("OIDC token is missing the Telegram account id claim.");
  }
  const telegramId = String(claims.id);
  if (!/^\d{8,10}$/.test(telegramId)) {
    console.error(
      `[oidc/callback] Telegram account id claim is not a valid numeric id (id=${telegramId}).`,
    );
    throw new Error("OIDC subject is not a valid Telegram account id.");
  }

  // `sub` is an opaque subject identifier for the token itself, unrelated to
  // the Telegram account id — require it per the OIDC spec but never as the
  // account lookup key.
  if (typeof claims.sub !== "string" || !claims.sub) {
    console.error("[oidc/callback] id_token is missing the required 'sub' claim.");
    throw new Error("OIDC token is missing the subject claim.");
  }

  if (options.expectedNonce) {
    const tokenNonce = typeof claims.nonce === "string" ? claims.nonce : null;
    if (!tokenNonce || tokenNonce !== options.expectedNonce) {
      throw new Error("OIDC nonce mismatch (possible replay).");
    }
  }

  const rawName = typeof claims.name === "string" ? claims.name : "";
  const given = typeof claims.given_name === "string" ? claims.given_name : "";
  const family = typeof claims.family_name === "string" ? claims.family_name : "";
  const name = rawName || [given, family].filter(Boolean).join(" ").trim();

  return {
    telegramId,
    name,
    username:
      typeof claims.preferred_username === "string"
        ? claims.preferred_username
        : "",
    photoUrl: typeof claims.picture === "string" ? claims.picture : null,
  };
}