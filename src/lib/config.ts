export const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export const finalUsername = TELEGRAM_BOT_USERNAME.replace(/^@/, "");