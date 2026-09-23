export const TELEGRAM_BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export const finalUsername = TELEGRAM_BOT_USERNAME.replace(/^@/, "");
export const finalBotId = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID || "8389871615";
