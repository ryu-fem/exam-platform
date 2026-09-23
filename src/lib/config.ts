export const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export const finalUsername = TELEGRAM_BOT_USERNAME.replace(/^@/, "");

// The OAuth popup needs the numeric bot id on the client. It is intentionally
// never hardcoded here: a wrong id silently breaks the popup, so a missing env
// var must surface as a visible misconfiguration instead.
const finalBotId = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID ?? "").trim();

export const finalBotIdNumber = Number(finalBotId);

export function telegramBotIdConfigured() {
  return Number.isInteger(finalBotIdNumber) && finalBotIdNumber > 0;
}
