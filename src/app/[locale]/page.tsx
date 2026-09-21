import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  BarChart3,
  CircleCheck,
  Send,
  Star,
  Trophy,
  UserPlus,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { LandingBackground } from "@/components/landing/LandingBackground";
import { Reveal } from "@/components/landing/Reveal";
import { buttonVariants } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { getLandingStats } from "@/lib/landing-stats";
import { trackLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Horizontal rhythm: readable padding that still lets borders reach the edges. */
const SECTION_PAD = "px-6 md:px-12 lg:px-20";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const common = await getTranslations("common");
  const { totalStudents, totalQuizzes, topStudent } = await getLandingStats();

  const faqItems = [1, 2, 3, 4, 5].map((n) => ({
    q: t.raw(`faq${n}q` as never) as string,
    a: t.raw(`faq${n}a` as never) as string,
  }));

  const features = [
    {
      icon: Send,
      title: t("featureTelegramTitle"),
      desc: t("featureTelegramDesc"),
    },
    {
      icon: Star,
      title: t("featureLeaderboardTitle"),
      desc: t("featureLeaderboardDesc"),
    },
    {
      icon: CircleCheck,
      title: t("featureAutoTitle"),
      desc: t("featureAutoDesc"),
    },
    {
      icon: BarChart3,
      title: t("featureStatsTitle"),
      desc: t("featureStatsDesc"),
    },
  ];

  const heroCta = (
    <div className="flex flex-col gap-3 sm:flex-row">
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
  );

  return (
    <>
      <Navbar />
      <main className="relative w-full flex-1">
        {/* ── Masthead / hero ───────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-border">
          <LandingBackground />
          <div className={cn("relative z-10 py-12 sm:py-16 lg:py-20", SECTION_PAD)}>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
              <span>{t("badge")}</span>
              <span className="tabular-nums">
                {new Intl.DateTimeFormat(locale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(new Date())}
              </span>
            </div>

            <div className="mt-10 max-w-4xl">
              <Reveal>
                <h1 className="text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
                  {common("appName")}
                </h1>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="mt-6 max-w-3xl text-xl font-semibold leading-snug text-foreground/90 sm:text-2xl">
                  {t("tagline")}
                </p>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted">
                  {t("description")}
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                  <span>{t("verifiedMembership")}</span>
                  <span>{t("allTracksSupported")}</span>
                </div>
                <div className="mt-8">{heroCta}</div>
              </Reveal>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
              <Reveal delay={0.1}>
                <Stat value={totalStudents.toLocaleString()} label={t("totalStudents")} />
              </Reveal>
              <Reveal delay={0.16}>
                <Stat value={totalQuizzes.toLocaleString()} label={t("totalQuizzes")} />
              </Reveal>
              <Reveal delay={0.22}>
                <Stat value={topStudent ? topStudent.name : "—"} label={t("topStudentLabel")} />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Top student ───────────────────────────────────────── */}
        <section className="border-b border-border">
          <div className={cn("py-12 sm:py-16 lg:py-20", SECTION_PAD)}>
            <Reveal>
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
                01 —
              </span>
              <h2 className="mt-5 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">
                {t("topStudentHeading")}
              </h2>
              <p className="mt-2 text-sm uppercase tracking-[0.14em] text-muted">
                {t("topStudentSubtitle")}
              </p>
            </Reveal>

            {topStudent ? (
              <Reveal delay={0.1}>
                <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-surface-muted">
                    {topStudent.avatarUrl ? (
                      <Image
                        src={topStudent.avatarUrl}
                        alt={topStudent.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-2xl font-bold">
                        {topStudent.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold tracking-tight">
                      {topStudent.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {topStudent.track
                        ? trackLabel(topStudent.track, locale as "en" | "ar") ||
                          topStudent.track
                        : "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    <span className="text-4xl font-black tabular-nums tracking-tight">
                      {topStudent.totalXp.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted">{common("xp")}</span>
                  </div>
                </div>
              </Reveal>
            ) : (
              <Reveal delay={0.1}>
                <p className="mt-10 text-sm text-muted">{t("noTopStudent")}</p>
              </Reveal>
            )}
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────── */}
        <section className="border-b border-border">
          <div className={cn("py-12 sm:py-16 lg:py-20", SECTION_PAD)}>
            <Reveal>
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
                02 —
              </span>
              <h2 className="mt-5 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">
                {t("featuresTitle")}
              </h2>
              <p className="mt-2 text-sm uppercase tracking-[0.14em] text-muted">
                {t("featuresSubtitle")}
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-16">
              {features.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 0.06}>
                  <div>
                    <div className="flex items-center justify-between">
                      <feature.icon className="h-5 w-5" />
                      <span className="text-[11px] font-medium tabular-nums tracking-[0.22em] text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-6 text-lg font-bold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {feature.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ────────────────────────────────────────── */}
        <section className="border-b border-border">
          <div className={cn("py-12 sm:py-16 lg:py-20", SECTION_PAD)}>
            <Reveal>
              <div className="max-w-4xl">
                <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
                  {t("joinNow")}
                </span>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  {t("bottomCtaTitle")}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                  {t("bottomCtaSubtitle")}
                </p>
                <div className="mt-8">{heroCta}</div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────── */}
        <section>
          <div className={cn("py-12 sm:py-16 lg:py-20", SECTION_PAD)}>
            <Reveal>
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
                03 —
              </span>
              <h2 className="mt-5 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">
                {t("faqTitle")}
              </h2>
              <p className="mt-2 text-sm uppercase tracking-[0.14em] text-muted">
                {t("faqSubtitle")}
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mt-10 max-w-3xl">
              <FaqAccordion items={faqItems} />
            </Reveal>
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl">
        {value}
      </p>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
    </div>
  );
}