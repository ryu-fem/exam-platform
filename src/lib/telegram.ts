import { createHash, createHmac, timingSafeEqual } from "crypto";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

/** Fields delivered by the official Telegram Login Widget callback. */
export type TelegramAuthData = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: number | string;
  hash?: string;
};

const AUTH_DATA_MAX_AGE_SECONDS = 5 * 60;

/**
 * Server-side verification of the Login Widget callback (official protocol):
 * secret_key = sha256(bot_token); expected = hmac_sha256(secret_key,
 * data_check_string) where data_check_string is the sorted `key=value` lines.
 * Rejects tampered signatures and stale `auth_date` payloads.
 */
export function verifyTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
): { ok: boolean; error?: string } {
  if (!botToken) return { ok: false, error: "Bot token is not configured." };

  const hash = data.hash;
  if (typeof hash !== "string" || hash.length === 0) {
    return { ok: false, error: "Missing Telegram auth hash." };
  }

  const AUTH_KEYS = [
    "id",
    "first_name",
    "last_name",
    "username",
    "photo_url",
    "auth_date",
  ] as const satisfies ReadonlyArray<keyof TelegramAuthData>;

  // Build the data_check_string from the well-known fields ONLY — never from
  // attacker-controlled arbitrary keys.
  const checkString = AUTH_KEYS.filter(
    (key) => data[key] !== undefined && data[key] !== null,
  )
    .sort()
    .map((key) => `${key}=${String(data[key])}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  const providedBuf = Buffer.from(hash);
  const expectedBuf = Buffer.from(expected);
  if (
    providedBuf.length !== expectedBuf.length ||
    !timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return { ok: false, error: "Telegram auth signature mismatch." };
  }

  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, error: "Missing Telegram auth_date." };
  }
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > AUTH_DATA_MAX_AGE_SECONDS) {
    return { ok: false, error: "Telegram auth data has expired." };
  }
  if (authDate > now + 60) {
    return { ok: false, error: "Telegram auth date is in the future." };
  }
  return { ok: true };
}

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