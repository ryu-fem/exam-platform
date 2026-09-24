const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

export function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  opts: { parseMode?: "HTML" | "Markdown" } = {},
) {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`${API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chatId),
        text,
        parse_mode: opts.parseMode ?? "HTML",
      }),
    });
    return await res.json();
  } catch {
    return null;
  }
}

export async function notifyAdmin(text: string) {
  const adminId = process.env.TELEGRAM_ADMIN_ID;
  if (!adminId) return null;
  return sendTelegramMessage(adminId, text);
}

/**
 * Fetch the most recent Telegram profile photo for a user (requires the user
 * to have interacted with the bot). Returns a direct image URL or null.
 */
export async function getTelegramProfilePhoto(
  telegramId: string | number,
): Promise<string | null> {
  if (!BOT_TOKEN || !telegramId) return null;
  try {
    const res = await fetch(
      `${API_URL}/getUserProfilePhotos?user_id=${encodeURIComponent(String(telegramId))}&limit=1`,
      { cache: "no-store" },
    );
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { photos?: { file_id: string }[][] };
    };
    const fileId = data.ok && data.result?.photos?.[0]?.[0]?.file_id;
    if (!fileId) return null;

    const fileRes = await fetch(
      `${API_URL}/getFile?file_id=${encodeURIComponent(fileId)}`,
      { cache: "no-store" },
    );
    const fileData = (await fileRes.json()) as {
      ok?: boolean;
      result?: { file_path?: string };
    };
    if (!fileData.ok || !fileData.result?.file_path) return null;

    return `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
  } catch {
    return null;
  }
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}