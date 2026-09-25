/**
 * ACTIVE PRODUCTION BOT — hard-pinned to @Quizplatbot / 8769306244.
 *
 * These are intentionally NOT read from build-time NEXT_PUBLIC_* env vars:
 * stale values from earlier deployments (e.g. hejqdadbot / 8389871615) get
 * inlined into cached assets and silently shadow a newer configuration.
 * Pinning here guarantees every rendered script tag references the active
 * bot, overriding any lingering staging cache.
 *
 * Keep TELEGRAM_BOT_TOKEN (runtime, NOT build-time) in sync: its numeric
 * prefix must equal TELEGRAM_BOT_ID or the Login Widget signature check in
 * /api/auth/telegram will fail.
 */
export const TELEGRAM_BOT_USERNAME = "Quizplatbot";
export const TELEGRAM_BOT_ID = 8769306244;

/** The active bot is statically pinned — always configured. */
export function telegramBotIdConfigured(): boolean {
  return true;
}

/** The numeric bot id the Login Widget must target. */
export function finalBotIdNumber(): number {
  return TELEGRAM_BOT_ID;
}

/**
 * OIDC client id for the OpenID Connect login flow. Defaults to the pinned bot
 * id (8769306244); override with TELEGRAM_CLIENT_ID only if BotFather issued a
 * distinct Client ID under "Web Login".
 */
export const TELEGRAM_CLIENT_ID =
  process.env.TELEGRAM_CLIENT_ID ?? String(TELEGRAM_BOT_ID);

/** Client secret from @BotFather → Bot Settings → Web Login. */
export function oidcClientSecret(): string {
  return process.env.TELEGRAM_CLIENT_SECRET ?? "";
}