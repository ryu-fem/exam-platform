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