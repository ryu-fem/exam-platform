# Exam Platform (منصة اختبارات)

A self-hostable exam platform built with **Next.js (App Router)**, **Tailwind CSS v4**, **Prisma + PostgreSQL (Neon)**, **NextAuth.js**, and a standalone **Telegram bot** (Render Background Worker).

## Architecture

| Layer       | Technology                          | Hosting            |
| ----------- | ----------------------------------- | ------------------ |
| Web App     | Next.js 16, Tailwind CSS v4, next-themes | Vercel         |
| Database    | PostgreSQL via Prisma ORM (driver adapter) | Neon.tech   |
| Telegram Bot| `node-telegram-bot-api` (standalone script) | Render (Background Worker) |

## Features

- Dual **light/dark theme** that follows the **system preference** by default with `next-themes` and a sliding **Theme Toggle switch** (Sun 🌞 / Moon 🌙).
- **Arabic (RTL) / English (LTR)** internationalization with `next-intl` — a **sliding Language Toggle** (EN / ع) switches **instantly** (SPA, keeps scroll position) by swapping the URL locale prefix (`/en/dashboard` ↔ `/ar/dashboard`) via `next-intl`'s `navigation` router. Every app route lives under `/[locale]` (`localePrefix: "always"`); the Proxy combines next-intl middleware with the auth guard so protected routes redirect to the current locale's `/login`). Layouts use Tailwind **logical properties** (`ms/me/ps/pe/start/end`) and both toggles/arrows mirror correctly in RTL.
- **Student dashboard** (`/dashboard`): **real statistics from the database** (completed quizzes, average score, best subject, XP = completed × 10 + average × 2, Level), a full-width **daily motivational quote in Egyptian Arabic** (Groq), and a clean **AI performance report** card. **Available Quizzes** live on their own page (`/quizzes`), filtered by the student's year/system/track from the DB (`Quiz` + `QuizAttempt` models). Fonts: **Inter** (English) / **Cairo** (Arabic) via `next/font`. Student navbar includes profile photo (fetched from Telegram), theme/language toggles, and logout.
- `GET /api/stats` exposes the logged-in student's stats as JSON (401 when unauthenticated).
- Landing page + **Create Account** (Login with Telegram widget) and **Login** (Telegram **or** Username/Password).
- **Onboarding** flow with conditional dropdowns:
  - Year 1 → General / Azhar
  - Year 2 → General / Azhar / **Baccalaureate** → Track → Elective subject
  - Year 3 → General / Azhar
- **Verification** step: user uploads Channel + Group screenshots (stored as base64 in Neon), the admin is notified on Telegram.
- **Pending approval** screen with a waiting animation (auto-refreshes every 5s).
- **Admin dashboard** (`/admin`): tabbed lists (pending/active/rejected), search, screenshot viewer, Approve / Reject with a reason, Telegram notifications to the user.
- Standalone **Telegram bot**: `/start` returns the onboarding URL with the user's Telegram ID, and forwards new-signup info to the admin.

---

## 1. Prerequisites

- Node.js 18+ (tested on Node 20+/22+)
- A free [Neon](https://neon.tech) PostgreSQL database
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- Your numeric Telegram **admin chat id** (message [@userinfobot](https://t.me/userinfobot), or run `/start` on your bot once and read the logs)
- A free Groq API key from [console.groq.com](https://console.groq.com/keys) for the AI dashboard features (quotes + performance analysis)

## 2. Setup

```bash
npx create-next-app@latest exam-platform   # optional; clone instead
cd exam-platform
npm install
```

Copy the environment template and fill it in:

```bash
cp .env.example .env
```

```dotenv
# Neon pooled connection string (optionally append &pgbouncer=true / sslmode=require)
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/exam-platform?sslmode=require"

TELEGRAM_BOT_TOKEN="123456789:AAE..."
TELEGRAM_ADMIN_ID="123456789"

NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="MyExamBot"
NEXT_PUBLIC_TELEGRAM_CHANNEL_URL="https://t.me/your_channel"
NEXT_PUBLIC_TELEGRAM_GROUP_URL="https://t.me/your_group"

NEXTAUTH_SECRET="openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"

GROQ_API_KEY="gsk_..."   # AI quotes + performance analysis (llama3-8b-8192, auto-fallback to llama-3.1-8b-instant)
```

> `NEXT_PUBLIC_*` vars are exposed to the browser — only put the **invite links** and the **bot username** there. The table names / screenshots never leave the server/DB.

### Run migrations & seed an admin

```bash
npm run db:deploy      # or: npx prisma migrate deploy
npm run db:seed        # creates an admin from ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_NAME
```

To create a new migration from scratch instead: `npx prisma migrate dev --name init`.

### Start locally

```bash
npm run dev            # http://localhost:3000
```

### Run the Telegram bot locally

```bash
npm run bot            # node bot.js
```

---

## 3. Deploy the Web App → Vercel

1. Push this repo to GitHub and **Import** it in [Vercel](https://vercel.com/new).
2. Framework preset: **Next.js** (auto-detected). Build command `npm run build`, output `.next`.
3. Add all variables from `.env.example` to **Environment Variables** (use the production URL for `NEXTAUTH_URL` / `APP_URL`, the **Neon pooled** connection string for `DATABASE_URL`, and your `GROQ_API_KEY` for the AI dashboard features).
4. Deploy. `npm run postinstall` (`prisma generate`) runs automatically during install.

> Prisma 7 uses a **WASM query compiler + driver adapter**, so no native query-engine binaries need to be deployed. `serverExternalPackages` for `@prisma/client` / `@prisma/adapter-neon` / `@neondatabase/serverless` is already configured in `next.config.ts`.

## 4. Deploy the Database → Neon

1. Create a project at [neon.tech](https://neon.tech) and copy the **pooled** connection string (`-pooler` endpoint / `?pgbouncer=true`).
2. Set it as `DATABASE_URL`, then from a terminal with the schema checked out:

```bash
npx prisma migrate deploy
npm run db:seed
```

3. Optional: point your Neon branch to the `main` branch so CI/Vercel deploys can run migrations automatically (or run `migrate deploy` locally before pushing).

## 5. Deploy the Telegram Bot → Render

1. Create a **New + → Background Worker** at [render.com](https://render.com).
2. Connect the same repo.
3. **Build Command:** `npm install`
4. **Start Command:** `node bot.js`
5. **Environment Variables:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_ID`, `APP_URL` (your Vercel URL, e.g. `https://your-app.vercel.app`).
6. Deploy. The bot polls Telegram and keeps running (no webhook needed).

Test it: message your bot `/start` → it replies with a button linking to `https://your-app.vercel.app/onboarding?telegramId=<your-id>`.

## 6. Post-deployment checklist

- [ ] Send `/start` to the bot from a test account and complete onboarding → upload screenshots on `/verify`.
- [ ] Log in as the admin (created by `db:seed`) → `/admin` → approve the user.
- [ ] Confirm the user receives the approval/rejection Telegram message.
- [ ] Toggle the theme switch on multiple pages (light/dark).
- [ ] Switch language EN ⇄ العربية and confirm the layout flips LTR/RTL; the dashboard shows the AI analysis and the daily Egyptian Arabic quote.

## Notes

- **Screenshots** are stored as base64 data URLs in the `Verification` table (each capped at ~8MB). For heavy traffic, swap storage for a file/CDN host and store URLs instead.
- **Security**: role checks happen server-side on every admin API route; `proxy.ts` guards page routes; passwords are hashed with `bcryptjs`; Telegram widget auth is verified with HMAC-SHA256.
- To change where users land right after onboarding (e.g. skip verification), edit `src/app/api/verify/route.ts` and the redirects in `src/app/verify/page.tsx`.