import { cookies } from "next/headers";
import { Cairo, Inter } from "next/font/google";

import { Providers } from "@/components/Providers";
import { LOCALE_COOKIE, getDir, resolveLocale } from "@/lib/locale";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  display: "swap",
});

/**
 * Root layout. Lives ABOVE the `[locale]` segment, so locale/lang/dir are
 * resolved from the `NEXT_LOCALE` cookie (synced by next-intl's middleware
 * on every request). The `html` element carries `suppressHydrationWarning`
 * so next-themes' inline (pre-hydration) theme class is never clobbered by
 * React, which kills the dark-mode flash on language/navigation changes.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html
      lang={locale}
      dir={getDir(locale)}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col transition-theme">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}