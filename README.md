# 🎓 Exam Platform

A full-stack exam platform for Egyptian secondary school students (Thanaweya Amma).

## ✨ Features

- 🔐 Telegram-first authentication (official Login Widget popup) + Username/Password
- 🎯 Quiz system with automatic grading
- 📊 Admin dashboard with statistics
- 🏆 Leaderboard
- 🌐 Arabic (RTL) + English (LTR)
- 🌓 Dark / Light mode
- 🤖 AI-powered motivational quotes & performance analysis
- 📱 Fully responsive

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (Supabase/Neon) + Prisma ORM
- **Auth:** NextAuth.js
- **i18n:** next-intl
- **Theme:** next-themes
- **AI:** Groq SDK

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/exam-platform.git
cd exam-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the values (see below).

### 4. Set up the database

```bash
npx prisma db push
npx prisma db seed
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the default locale is Arabic (RTL).

## 🔑 Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | ✅ | PostgreSQL connection strings |
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token from [@BotFather](https://t.me/BotFather) — used to **verify** the Login Widget signature server-side |
| `NEXT_PUBLIC_TELEGRAM_BOT_ID` | ✅ | Numeric bot id (the digits before `:` in the token). Used by the client to open the OAuth popup |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | ✅ | Bot username (no `@`) |
| `TELEGRAM_ADMIN_ID` | ✅ | Telegram user id that receives notifications |
| `NEXTAUTH_SECRET` | ✅ | Used to sign sessions **and** the short-lived onboarding tokens |
| `NEXTAUTH_URL` | ✅ | Canonical site URL |
| `APP_URL` | ✅ | Public site URL (used in bot messages) |
| `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` / `NEXT_PUBLIC_TELEGRAM_GROUP_URL` | | Channel/group links |
| `ADMIN_USERNAME` / `ADMIN_NAME` / `ADMIN_PASSWORD` | ✅ | Seed admin credentials |
| `GROQ_API_KEY` | | Used for AI analysis |
| `TELEGRAM_WEBHOOK_SECRET` | | If set, the `/api/telegram/webhook` route rejects updates without a matching `X-Telegram-Bot-Api-Secret-Token` |

> ⚠️ `NEXT_PUBLIC_TELEGRAM_BOT_ID` (and `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`) are **inlined at build time**. After changing them you must rebuild (`npm run build`), not just restart the server.

## 🤖 Telegram Login Widget setup (BotFather)

The register/login flow uses the official **Telegram Login Widget**. It will silently
fail ("login never proceeds") if the bot and domain are not configured correctly:

1. Open [@BotFather](https://t.me/BotFather) → select your bot → tap **Bot Settings**.
2. Choose **Domain** (`/setdomain`) and enter your site's domain **without** scheme or
   path — e.g. `ahmed-elgohary.com` (or `localhost` while developing).
3. Confirm that `NEXT_PUBLIC_TELEGRAM_BOT_ID` equals the numeric prefix of
   `TELEGRAM_BOT_TOKEN`. If they disagree, the popup and the server-side signature
   check target different bots and every login fails.

Flow after a successful popup:

1. The widget calls `Telegram.Login.auth({ bot_id, request_access: "write" })` and
   returns `{ id, first_name, username, photo_url, auth_date, hash }`.
2. `/api/auth/telegram` re-verifies the HMAC-SHA256 signature server-side with
   `TELEGRAM_BOT_TOKEN` (rejecting stale `auth_date`) and, for new users, issues a
   **short-lived signed onboarding token** (15 min, HMAC over `NEXTAUTH_SECRET`).
3. The token lives in `sessionStorage` only — it never appears in the URL. The
   registration submit (`/api/onboarding`) requires that token in the
   `Authorization: Bearer` header and **ignores** any `telegramId` sent in the body.

## 🧪 Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## 🚢 Deployment

The project is designed for [Vercel](https://vercel.com) with Supabase/Neon Postgres:

```bash
vercel deploy --prod
```

Set the same env vars above in your Vercel project settings (server-side vars are not
exposed to the client bundle). For the Telegram webhook `/start` handler:

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=https://YOUR_DOMAIN/api/telegram/webhook" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```