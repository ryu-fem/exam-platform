# 🎓 Exam Platform

A full-stack exam platform for Egyptian secondary school students (Thanaweya Amma).

## ✨ Features

- 🔐 Username/Password authentication (optionally linked to a Telegram chat)
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
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token from [@BotFather](https://t.me/BotFather) — used for **bot notifications**, `/api/telegram/webhook`, and server-side verification of the **Telegram Login Widget** signature |
| `NEXT_PUBLIC_TELEGRAM_BOT_ID` / `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | ✅ | Bot id + username — inlined at build time to render the Telegram Login Widget (Step 1 of registration) |
| `TELEGRAM_ADMIN_ID` | ✅ | Telegram user id that receives notifications |
| `NEXTAUTH_SECRET` | ✅ | Used to sign sessions |
| `NEXTAUTH_URL` | ✅ | Canonical site URL |
| `APP_URL` | ✅ | Public site URL (used in bot messages) |
| `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` / `NEXT_PUBLIC_TELEGRAM_GROUP_URL` | | Channel/group links |
| `ADMIN_USERNAME` / `ADMIN_NAME` / `ADMIN_PASSWORD` | ✅ | Seed admin credentials |
| `GROQ_API_KEY` | | Used for AI analysis |
| `TELEGRAM_WEBHOOK_SECRET` | | If set, the `/api/telegram/webhook` route rejects updates without a matching `X-Telegram-Bot-Api-Secret-Token` |

## 🤖 Telegram bot setup (BotFather)

The bot is used for **admin/student notifications** (account approved, quiz
attempt approved, etc.) and the `/api/telegram/webhook` magic-link flow.

It also powers the **Telegram Login Widget**: registration starts on Step 1
(10% progress) with a Telegram login, the signed widget payload is re-verified
server-side at `/api/auth/telegram`, and first-time users receive a short-lived
(15 min) signing token that `/api/onboarding` consumes — the `telegramId` and
`avatarUrl` are locked server-side from that token and are never accepted from
the request body. New accounts are created as `pending` and get **read-only
guest** access (browse + see results only) until an admin approves them in the
Requests panel.

### Current verified bot credentials (production)

| Config | Value |
| --- | --- |
| Bot username | `hejqdadbot` |
| `TELEGRAM_BOT_TOKEN` | `8389871615:AAF…` from @BotFather |
| `NEXTAUTH_URL` / `APP_URL` | `https://exam-platform-one-omega.vercel.app` |
| Webhook domain | `exam-platform-one-omega.vercel.app` |

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