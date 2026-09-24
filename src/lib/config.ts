const BOT_ID_ENV = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;

/** Whether a bot id is explicitly configured through the environment. */
export function telegramBotIdConfigured(): boolean {
  return typeof BOT_ID_ENV === "string" && BOT_ID_ENV.length > 0;
}

/**
 * The numeric bot id the Login Widget must target. Falls back to the known
 * production bot (@Quizplatbot / 8769306244) when the build-time env var is
 * unset so the button keeps working out of the box.
 */
export function finalBotIdNumber(): number {
  const parsed = Number(BOT_ID_ENV);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8769306244;
}

export const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "Quizplatbot";