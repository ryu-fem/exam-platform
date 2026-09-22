/**
 * Exam Platform — Telegram Bot
 * Deploy on Railway/Render as a Background Worker
 */

const TelegramBot = require("node-telegram-bot-api");

if (typeof TelegramBot !== "function") {
  console.error("❌ TelegramBot is not a constructor");
  process.exit(1);
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;
const APP_URL = process.env.APP_URL || "https://your-app.vercel.app";

if (!TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

bot.setMyCommands([
  { command: "start", description: "Start registration / get your link" },
  { command: "status", description: "Check your registration link" },
]);

function onboardingUrl(chatId) {
  return `${APP_URL}/onboarding?telegramId=${encodeURIComponent(chatId)}`;
}

function escapeHtml(str) {
  return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const url = onboardingUrl(chatId);

  const text =
    `👋 Welcome to the Exam Platform!\n\n` +
    `Use the button below (or open the link) to continue creating your account ` +
    `right in the browser. Your Telegram ID is already linked.\n\n` +
    `${url}`;

  bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [[{ text: "🚀 Continue registration", url }]],
    },
  });

  if (ADMIN_ID && String(ADMIN_ID) !== String(chatId)) {
    const name = msg.from ? msg.from.first_name || "Unknown" : "Unknown";
    bot
      .sendMessage(
        ADMIN_ID,
        `🆕 A new user started the registration process:\n\n` +
          `👤 Name: <b>${escapeHtml(name)}</b>\n` +
          `🆔 Telegram ID: <code>${chatId}</code>\n` +
          `📎 Username: ${
            msg.from?.username ? "@" + escapeHtml(msg.from.username) : "—"
          }`,
        { parse_mode: "HTML" },
      )
      .catch(() => {});
  }
});

bot.onText(/\/status/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `Your registration link:\n${onboardingUrl(msg.chat.id)}`,
    {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎯 Open registration", url: onboardingUrl(msg.chat.id) }],
        ],
      },
    },
  );
});

bot.on("message", (msg) => {
  const text = msg.text || "";
  if (msg.chat.type === "private" && !text.startsWith("/")) {
    bot
      .sendMessage(
        msg.chat.id,
        `I don't understand that. Use /start to get your registration link.`,
      )
      .catch(() => {});
  }
});

bot.on("polling_error", (err) => {
  console.error("[polling_error]", err.code || err.message || err);
});

console.log(`🤖 Exam Platform bot is running (polling)...`);
console.log(`Onboarding base URL: ${APP_URL}`);
if (ADMIN_ID) console.log(`Admin notifications: enabled (${ADMIN_ID})`);