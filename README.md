# Exam Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql&logoColor=white)](https://supabase.com)
[![Telegram OIDC](https://img.shields.io/badge/Login-Telegram_OIDC-26A5E4?logo=telegram&logoColor=white)](https://core.telegram.org/bots/telegram-login)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

A full-stack exam platform built for Egyptian secondary school students (Thanaweya Amma). Students log in via Telegram, get sorted into their track (general / Azhari / IG), take auto-graded quizzes, and track their rank on a leaderboard.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS**
- **PostgreSQL** (Supabase) via **Prisma**
- **NextAuth.js** for sessions
- **next-intl** for i18n (Arabic RTL / English LTR)
- **next-themes** for dark/light mode
- **Groq SDK** for AI-generated performance summaries

## Getting started

```bash
git clone https://github.com/ryu-fem/exam-platform.git
cd exam-platform
npm install
cp .env.example .env   # fill in the values below
npx prisma db push
npx prisma db seed
npm run dev
```

App runs at `http://localhost:3000`, default locale is Arabic.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | ✓ | Postgres connection strings (pooled / direct) |
| `TELEGRAM_BOT_TOKEN` | ✓ | From @BotFather. Used for notifications and the `/api/telegram/webhook` `/start` handler |
| `NEXT_PUBLIC_TELEGRAM_BOT_ID` / `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | | Pinned to `8769306244` / `Quizplatbot` in `src/lib/config.ts` so a stale env var can't silently point the login flow at the wrong bot |
| `TELEGRAM_OIDC_CLIENT_ID` | | From BotFather → Bot Settings → Web Login. Defaults to the pinned bot id if not set |
| `TELEGRAM_OIDC_CLIENT_SECRET` | ✓ | Same place as above. Required for Telegram login |
| `TELEGRAM_ADMIN_ID` | ✓ | Telegram user id that receives admin notifications |
| `TELEGRAM_WEBHOOK_SECRET` | | If set, `/api/telegram/webhook` rejects any request without a matching `X-Telegram-Bot-Api-Secret-Token` header |
| `NEXTAUTH_SECRET` | ✓ | Session signing key |
| `NEXTAUTH_URL` / `APP_URL` | ✓ | Public site URL |
| `NEXT_PUBLIC_TELEGRAM_CHANNEL_URL` / `NEXT_PUBLIC_TELEGRAM_GROUP_URL` | | Links shown in the UI |
| `ADMIN_USERNAME` / `ADMIN_NAME` / `ADMIN_PASSWORD` | ✓ | Seed admin account |
| `GROQ_API_KEY` | | Powers the AI performance summaries |

## Telegram login

Login uses Telegram's OIDC flow (`oauth.telegram.org`), not the legacy iframe widget — the widget's third-party iframe/cookies get blocked by strict browsers on free `*.vercel.app` domains, which was causing silent login failures.

1. `GET /api/telegram/oidc/init` sets `state`, PKCE `code_verifier`, and a `nonce` as httpOnly cookies, and returns Telegram's authorization URL. No third-party script or iframe is loaded.
2. User approves in Telegram → redirected to `GET /api/telegram/oidc/callback` (`redirect_uri` must be registered as an Allowed URL in BotFather).
3. The callback validates `state`, exchanges the code at `oauth.telegram.org/token` (Basic auth with the client secret + PKCE verifier), and verifies the RS256 `id_token` against Telegram's JWKS (issuer, audience, expiry, nonce all checked).
4. New users get a short-lived signed onboarding token and continue to step 2 of registration. Existing users get a NextAuth session and land on the dashboard. `telegramId` is always read from the verified token — never trusted from the client.

New accounts are created as `pending` with read-only access until an admin approves them from the Requests panel.

### Bot setup checklist

- [@BotFather](https://t.me/BotFather) → your bot → **Bot Settings → Web Login** → register `${APP_URL}/api/telegram/oidc/callback` as an allowed redirect URI, copy the client secret into `TELEGRAM_OIDC_CLIENT_SECRET`
- Same bot → `/setdomain` → set it to your app's domain (no scheme, no path)
- Register the webhook for the `/start` notification handler:

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  --data-urlencode "url=${APP_URL}/api/telegram/webhook" \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Only one thing should ever be listening on this bot token at a time. Don't run a separate polling process (e.g. a standalone `bot.cjs` on another host) alongside the webhook — Telegram will silently drop updates for whichever one loses the race.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Deployment

Deployed on Vercel. Set every variable from the table above in the project's environment settings — anything not prefixed `NEXT_PUBLIC_` stays server-side.

```bash
vercel deploy --prod
```