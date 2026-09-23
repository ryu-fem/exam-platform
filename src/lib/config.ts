export function telegramBotIdConfigured(): boolean {
  const botId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID;
  return typeof botId === "string" && botId.length > 0;
}

// The popup needs a numeric bot id. Prefer the env var; fall back to the
// verified production bot so a missing/malformed env value never dead-locks
// the Login button (it silently falls back to the known-good bot instead).
export const finalBotIdNumber =
  Number(process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID) || 8389871615;