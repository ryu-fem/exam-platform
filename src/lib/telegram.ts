import crypto from "crypto";

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
 * Verify a Telegram Login Widget auth payload.
 * @param query The auth object received from the widget callback
 */
export function verifyTelegramAuth(query: Record<string, string>): boolean {
  if (!BOT_TOKEN) return false;
  const { hash, ...rest } = query;
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return false;

  // Reject stale logins: the auth payload must have been produced within the
  // last day, and must not be from the future.
  const authDate = Number(query.auth_date);
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (!Number.isFinite(authDate) || ageSeconds < 0 || ageSeconds > 86400) {
    return false;
  }

  const dataCheckString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("\n");

  const secretKey = crypto
    .createHash("sha256")
    .update(BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(hash, "hex"),
  );
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