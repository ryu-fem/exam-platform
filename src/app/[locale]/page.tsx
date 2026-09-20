import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, GraduationCap, ShieldCheck, UserPlus } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { buttonVariants } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const common = await getTranslations("common");

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="mx-auto w-full max-w-3xl py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted transition-colors duration-200">
            <GraduationCap className="h-4 w-4" />
            {t("badge")}
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {common("appName")}
            <span className="mt-3 block text-lg font-medium text-muted sm:text-xl">
              {t("subtitle")}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg">
            {t("description")}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={buttonVariants({ size: "lg" }) + " w-full sm:w-auto"}
            >
              <UserPlus className="h-4 w-4" />
              {t("createAccount")}
            </Link>
            <Link
              href="/login"
              className={
                buttonVariants({ variant: "secondary", size: "lg" }) +
                " w-full sm:w-auto"
              }
            >
              {t("login")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>

          <div className="mt-16 flex flex-col items-center justify-center gap-2 text-sm text-muted sm:flex-row sm:gap-6">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              {t("verifiedMembership")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" />
              {t("allTracksSupported")}
            </span>
          </div>
        </div>
      </main>
    </>
  );
}