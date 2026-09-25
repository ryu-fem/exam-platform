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
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token from [@BotFather](https://t.me/BotFather) — used for **bot notifications**, `/api/telegram/webhook`, and server-side verification of the **Telegram Login Widget** signature. Its numeric prefix must match `TELEGRAM_BOT_ID` (`8769306244`) |
| `NEXT_PUBLIC_TELEGRAM_BOT_ID` / `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | | **Pinned** to `@Quizplatbot` / `8769306244` in `src/lib/config.ts` — not read at build time, so stale values can't shadow the active bot |
| `TELEGRAM_CLIENT_ID` | | OIDC client id. Defaults to the pinned bot id (`8769306244`); set only if BotFather issued a distinct Client ID under **Bot Settings → Web Login** |
| `TELEGRAM_CLIENT_SECRET` | ✅* | OIDC client secret from **BotFather → Bot Settings → Web Login**. Required for the OpenID Connect login (the login button uses OIDC, not the legacy widget) |
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

It also powers **Telegram login**, which uses the official **OpenID Connect
(OIDC)** flow (`oauth.telegram.org`) — replacing the legacy iframe login widget
whose third-party iframe + cookies could be blocked by strict browsers on free
`*.vercel.app` hosting.

Flow:

- The login button calls `GET /api/telegram/oidc/init`, which pins a CSRF
  `state`, PKCE `code_verifier`, and anti-replay `nonce` as httpOnly cookies and
  returns the official `oauth.telegram.org/auth` URL. No third-party script or
  iframe is ever loaded.
- The user approves in Telegram; the browser returns to
  `GET /api/telegram/oidc/callback` with a `code` (`redirect_uri` = `${APP_URL}/api/telegram/oidc/callback`, registered as an Allowed URL in BotFather).
- The callback validates `state`, exchanges the code at `oauth.telegram.org/token`
  (HTTP Basic auth with the Client Secret + PKCE), and verifies the RS256-signed
  `id_token` against Telegram's published JWKS (issuer `https://oauth.telegram.org`,
  audience = Client ID, expiry, nonce).
- New students get a short-lived (15 min) signed onboarding token → the
  registration wizard persists it and continues Step 2. Known students get a
  NextAuth JWT session signed server-side (PENDING signs in as a read-only
  guest; only rejected accounts are blocked) and land on the dashboard.
  The `telegramId` is only ever taken from the verified token, never from the
  client. New accounts are created as `pending` with **read-only guest** access
  (browse + see results only) until an admin approves them in the Requests panel.

### Current verified bot credentials (production)

| Config | Value |
| --- | --- |
| Bot username | `Quizplatbot` |
| `TELEGRAM_BOT_TOKEN` | `8769306244:AAF…` from @BotFather |
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