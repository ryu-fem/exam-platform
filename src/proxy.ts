import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_FILE = /\.(.*)$/;

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/verify",
  "/pending",
  "/admin",
  "/leaderboard",
  "/settings",
  "/quizzes",
];

function requiresAuth(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function resolveLocaleFromPath(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return routing.defaultLocale;
}

function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1);
    }
  }
  return pathname;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon.ico") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);
  if (intlResponse.status !== 200) {
    return intlResponse;
  }

  const bare = stripLocalePrefix(pathname);

  if (requiresAuth(bare)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.id) {
      const locale = resolveLocaleFromPath(pathname);
      const url = new URL(`/${locale}/login`, request.url);
      url.searchParams.set("callbackUrl", bare);
      return NextResponse.redirect(url);
    }

    if (bare.startsWith("/admin") && token.role !== "admin") {
      const locale = resolveLocaleFromPath(pathname);
      return NextResponse.redirect(
        new URL(`/${locale}/dashboard`, request.url),
      );
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot|otf|js|css|json)$).*)",
  ],
};