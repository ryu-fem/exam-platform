import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Cairo, Inter } from "next/font/google";

import { Providers } from "@/components/Providers";
import { Footer } from "@/components/Footer";
import { PageFade } from "@/components/PageFade";
import { Toaster } from "@/components/ui/Toaster";
import { routing } from "@/i18n/routing";
import { getDir } from "@/lib/locale";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const common = await getTranslations({ locale, namespace: "common" });
  const metadata = await getTranslations({ locale, namespace: "metadata" });
  const appName = common("appName");

  return {
    title: {
      default: appName,
      template: `%s | ${appName}`,
    },
    description: metadata("description"),
  };
}

/**
 * Locale layout. Lives INSIDE the `[locale]` segment, so `lang`/`dir` are
 * derived from the URL locale and stay in sync during client-side navigation.
 * `suppressHydrationWarning` keeps next-themes' inline (pre-hydration) theme
 * class from being clobbered by React, which prevents the dark-mode flash and
 * the direction flicker on first paint.
 */
export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={getDir(locale)}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${cairo.variable} h-full antialiased`}
    >
      <head>
        {/*
          Pre-paint theme bootstrap. Runs in <head> before the body parses, so
          the `.dark` class (and its CSS variables) are in place before first
          paint — preventing a light→dark flash on reload. It mirrors
          next-themes' own resolution (localStorage key `theme`, default
          follows the OS via prefers-color-scheme) and is idempotent with it:
          the same key is read, the same class is set, so the two scripts can
          never disagree.
        */}
        <script
          id="theme-init"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("theme");var sys=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=s||(sys?"dark":"light");if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col transition-theme">
        <Providers>
          <NextIntlClientProvider>
            <PageFade>
              {children}
              <Footer />
            </PageFade>
          </NextIntlClientProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}