import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Cairo, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { routing } from "@/i18n/routing";
import { getDir } from "@/lib/locale";
import "../globals.css";

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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
      className={`${inter.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col transition-theme">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}