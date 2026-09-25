"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { ArrowLeft, BookOpenText, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label, Field } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ErrorBanner } from "@/components/ui/Alert";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { Link, useRouter } from "@/i18n/navigation";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import {
  BACCALAUREATE_ELECTIVES,
  BACCALAUREATE_TRACKS,
  SECTIONS,
  SYSTEMS,
  YEARS,
  sectionsFor,
  subjectsForProfile,
  subjectLabel,
  type CurriculumLabel,
} from "@/lib/curriculum";

const STEPS = [
  { labelKey: "stepOne", pct: 10 },
  { labelKey: "stepTwo", pct: 55 },
  { labelKey: "stepThree", pct: 100 },
] as const;

type Step = (typeof STEPS)[number];

type Issues = Record<string, string[] | undefined>;

type Profile = {
  name: string;
  username: string;
  photoUrl: string;
};

function localize(label: CurriculumLabel, locale: string): string {
  return locale === "ar" ? label.ar : label.en;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

const YEAR_VALUES = ["1", "2", "3"];
const SECTION_VALUES = Array.from(
  new Set(Object.values(SECTIONS).flat().map((s) => s.value)),
);
const TRACK_VALUES = BACCALAUREATE_TRACKS.map((t) => t.value);

const STORAGE_TOKEN_KEY = "telegram_onboarding_token";
const STORAGE_PROFILE_KEY = "telegram_onboarding_profile";

function readStoredProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      name: parsed.name ?? "",
      username: parsed.username ?? "",
      photoUrl: parsed.photoUrl ?? "",
    };
  } catch {
    return null;
  }
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_TOKEN_KEY);
  } catch {
    return null;
  }
}

function buildSchema(msg: (key: string) => string, usernameTaken: boolean) {
  return z
    .object({
      name: z.string().trim().min(2, msg("errFullNameMin")),
      username: z
        .string()
        .trim()
        .min(3, msg("errUsernameMin"))
        .max(20, msg("errUsernameMax"))
        .regex(USERNAME_PATTERN, msg("errUsernamePattern")),
      password: z
        .string()
        .min(8, msg("errPasswordMin"))
        .regex(PASSWORD_POLICY, msg("errPasswordComplexity")),
      year: z.string().min(1, msg("errGrade")),
      system: z.string().min(1, msg("errSystem")),
      section: z.string().optional(),
      track: z.string().optional(),
      electiveSubject: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.year && !YEAR_VALUES.includes(data.year)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["year"],
          message: msg("errGrade"),
        });
      }

      const validSystems = (SYSTEMS[data.year] ?? []).map((s) => s.value);
      if (data.year && !validSystems.includes(data.system)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["system"],
          message: msg("errSystemNotOffered"),
        });
      }

      if (data.system === "baccalaureate") {
        if (!TRACK_VALUES.includes(data.track ?? "")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["track"],
            message: msg("errTrack"),
          });
        }
        if (data.track) {
          const validElectives = (
            BACCALAUREATE_ELECTIVES[data.track] ?? []
          ).map((e) => e.value);
          if (
            !data.electiveSubject ||
            !validElectives.includes(data.electiveSubject)
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["electiveSubject"],
              message: msg("errElective"),
            });
          }
        }
      } else if (data.system) {
        const validSections = (
          SECTIONS[`${data.year}:${data.system}`] ?? []
        ).map((s) => s.value);

        if (validSections.length > 0) {
          if (!data.section || !validSections.includes(data.section)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["section"],
              message: msg("errSection"),
            });
          }
        } else if (data.section && !SECTION_VALUES.includes(data.section)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["section"],
            message: msg("errSectionNotOffered"),
          });
        }
      }

      if (usernameTaken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["username"],
          message: msg("errUsernameTaken"),
        });
      }
    });
}

type OnboardingValues = z.infer<ReturnType<typeof buildSchema>>;

export function RegistrationWizard() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const to = useTranslations("onboarding");
  const tc = useTranslations("common");
  const isAr = locale === "ar";

  const [step, setStep] = useState<Step>(() => {
    const resumed = readStoredToken();
    return resumed ? STEPS[1] : STEPS[0];
  });
  const [telegramToken, setTelegramToken] = useState<string | null>(() =>
    readStoredToken(),
  );
  const [telegramProfile, setTelegramProfile] = useState<Profile | null>(() =>
    readStoredProfile(),
  );
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [issues, setIssues] = useState<Issues>({});
  const [busy, setBusy] = useState(false);

  /* OIDC onboarding hand-off is consumed below, after useForm is set up. */

  const schema = useMemo(
    () => buildSchema((key) => to(key as Parameters<typeof to>[0]), usernameTaken),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAr, usernameTaken],
  );
  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
    reset,
  } = useForm<OnboardingValues>({
    resolver,
    mode: "all",
    defaultValues: {
      name: telegramProfile?.name ?? "",
      username: "",
      password: "",
      year: "",
      system: "",
      section: "",
      track: "",
      electiveSubject: "",
    },
  });

  const oidcParamsConsumed = useRef(false);

  // Ingest the Telegram OIDC onboarding hand-off: the callback redirects new
  // students to /register with a short-lived signed token + Telegram profile.
  // It is persisted to sessionStorage (matching the resume behavior) and the
  // query string is stripped so the token does not linger in the URL.
  useEffect(() => {
    if (oidcParamsConsumed.current) return;
    const isHandoff = searchParams.get("telegram_oidc");
    if (isHandoff !== "1") return;

    oidcParamsConsumed.current = true;
    const token = searchParams.get("token");
    if (!token) return;

    const profile: Profile = {
      name: searchParams.get("name") ?? "",
      username: searchParams.get("username") ?? "",
      photoUrl: searchParams.get("photo") ?? "",
    };

    try {
      window.sessionStorage.setItem(STORAGE_TOKEN_KEY, token);
      window.sessionStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Storage is a convenience, never a requirement.
    }

    setTelegramToken(token);
    setTelegramProfile(profile);
    if (profile.name) {
      setValue("name", profile.name, { shouldValidate: true });
    }
    router.replace("/register");
  }, [searchParams, router, setValue]);

  const watchedYear = watch("year");
  const watchedSystem = watch("system");
  const watchedSection = watch("section");
  const watchedTrack = watch("track");
  const watchedElective = watch("electiveSubject");
  const watchedUsername = watch("username");

  const systemOptions = useMemo(
    () => (watchedYear ? (SYSTEMS[watchedYear] ?? []) : []),
    [watchedYear],
  );
  const sectionOptions = useMemo(
    () => sectionsFor(watchedYear, watchedSystem),
    [watchedYear, watchedSystem],
  );
  const trackOptions = useMemo(
    () => (watchedSystem === "baccalaureate" ? BACCALAUREATE_TRACKS : []),
    [watchedSystem],
  );
  const electiveOptions = useMemo(
    () =>
      watchedSystem === "baccalaureate" && watchedTrack
        ? (BACCALAUREATE_ELECTIVES[watchedTrack] ?? [])
        : [],
    [watchedSystem, watchedTrack],
  );

  const subjects = useMemo(
    () =>
      subjectsForProfile({
        year: watchedYear || null,
        system: watchedSystem || null,
        section: watchedSection || null,
        track: watchedTrack || null,
        electiveSubject: watchedElective || null,
      }),
    [watchedYear, watchedSystem, watchedSection, watchedTrack, watchedElective],
  );

  // Debounced uniqueness check against the API.
  useEffect(() => {
    let cancelled = false;
    const value = watchedUsername?.trim() ?? "";

    if (!USERNAME_PATTERN.test(value)) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/username-check?username=${encodeURIComponent(value)}`,
        );
        if (cancelled) return;
        const json = (await res.json()) as { ok: boolean; taken?: boolean };
        if (cancelled) return;
        setUsernameTaken(Boolean(json.taken));
        void trigger("username");
      } catch {
        // Network failure — the server re-validates uniqueness on submit.
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedUsername]);

  const setSelect = (name: keyof OnboardingValues, value: string) => {
    setValue(name, value, { shouldValidate: true, shouldDirty: true });
  };

  const wipe = (names: (keyof OnboardingValues)[]) => {
    for (const name of names) setValue(name, "", { shouldValidate: true });
  };

  const resetAfterYear = (nextYear: string) => {
    setSelect("year", nextYear);
    wipe(["system", "section", "track", "electiveSubject"]);
    void trigger();
  };

  const resetAfterSystem = (nextSystem: string) => {
    setSelect("system", nextSystem);
    wipe(["section", "track", "electiveSubject"]);
    void trigger();
  };

  const clearAuthSession = () => {
    setTelegramToken(null);
    setTelegramProfile(null);
    setStep(STEPS[0]);
    try {
      window.sessionStorage.removeItem(STORAGE_TOKEN_KEY);
      window.sessionStorage.removeItem(STORAGE_PROFILE_KEY);
    } catch {
      // ignore
    }
  };

  const nextToAccountStep = () => setStep(STEPS[1]);

  const nextToAcademicStep = async () => {
    const ok = await trigger(["name", "username", "password"]);
    if (ok) setStep(STEPS[2]);
  };

  const onSubmit = async (values: OnboardingValues) => {
    if (!telegramToken) {
      setGlobalError(t("telegramSessionExpired"));
      setStep(STEPS[0]);
      return;
    }

    setBusy(true);
    setGlobalError("");
    setIssues({});

    const payload: Record<string, string> = {
      name: values.name,
      username: values.username,
      password: values.password,
      year: values.year,
      system: values.system,
    };
    if (values.section) payload.section = values.section;
    if (values.track) payload.track = values.track;
    if (values.electiveSubject) payload.electiveSubject = values.electiveSubject;

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${telegramToken}`,
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        issues?: Issues;
      };

      if (res.status === 401) {
        // The onboarding token expired or was invalidated — re-auth needed.
        clearAuthSession();
        setGlobalError(t("telegramSessionExpired"));
        setBusy(false);
        return;
      }

      if (!json.ok) {
        setGlobalError(json.error ?? tc("errorSomething"));
        setIssues(json.issues ?? {});

        if (json.issues?.username?.[0]) {
          setUsernameTaken(true);
          void trigger("username");
        }
        setBusy(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        redirect: false,
        username: values.username,
        password: values.password,
      });

      if (signInRes?.error) {
        reset();
        router.push("/login");
        return;
      }

      try {
        window.sessionStorage.removeItem(STORAGE_TOKEN_KEY);
        window.sessionStorage.removeItem(STORAGE_PROFILE_KEY);
      } catch {
        // ignore
      }
      // Success. Accounts start as "pending" guest mode — let them browse.
      router.push("/dashboard");
    } catch {
      setGlobalError(tc("tryAgain"));
      setBusy(false);
    }
  };

  const isBaccalaureate = watchedSystem === "baccalaureate";
  const accountStepValid = !(errors.name || errors.username || errors.password);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <AnimatedBackground />
        <div className="relative z-10 w-full max-w-md">
          {/* Progress header */}
          <div className="mb-6">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted">
              <span>{t(step.labelKey)}</span>
              <span>{step.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${step.pct}%` }}
              />
            </div>
          </div>

          <Card>
            <CardContent>
              {step === STEPS[0] ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 pb-2 pt-2 text-center">
                    <Logo showText={false} size={56} />
                    <h1 className="text-2xl font-bold tracking-tight">
                      {t("registerStepTitle")}
                    </h1>
                    <p className="max-w-xs text-sm text-muted">
                      {t("registerStepSubtitle")}
                    </p>
                  </div>

                  {/* Step 1 description ends above — the official native
                      Telegram button is anchored directly below it. */}
                  {telegramToken && telegramProfile ? (
                    <>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-surface">
                          {telegramProfile.photoUrl ? (
                            <Image
                              src={telegramProfile.photoUrl}
                              alt={telegramProfile.name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-base font-semibold text-muted">
                              {(telegramProfile.name || "?").slice(0, 1)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {telegramProfile.name || "—"}
                          </p>
                          {telegramProfile.username && (
                            <p className="truncate text-xs text-muted">
                              @{telegramProfile.username}
                            </p>
                          )}
                          <div className="mt-1">
                            <Badge variant="success">
                              <ShieldCheck className="h-3 w-3" />
                              {to("telegramLinked")}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="lg"
                        className="w-full"
                        onClick={nextToAccountStep}
                      >
                        {to("continue")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={clearAuthSession}
                      >
                        {to("relinkTelegram")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-3">
                        <TelegramLoginButton />
                      </div>

                      <p className="pt-2 text-center text-sm text-muted">
                        {t("haveAccountLogin")}{" "}
                        <Link
                          href="/login"
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {t("login")}
                        </Link>
                      </p>
                    </>
                  )}

                  {globalError && <ErrorBanner>{globalError}</ErrorBanner>}
                </div>
              ) : step === STEPS[1] ? (
                <>
                  <div className="flex flex-col items-center gap-3 pb-2 pt-2 text-center">
                    <Logo showText={false} size={56} />
                    <h1 className="text-2xl font-bold tracking-tight">
                      {t("accountStepTitle")}
                    </h1>
                    <p className="max-w-xs text-sm text-muted">
                      {t("accountStepSubtitle")}
                    </p>
                  </div>

                  {globalError && <ErrorBanner>{globalError}</ErrorBanner>}

                  <div className="space-y-4">
                    <Field>
                      <Label htmlFor="name">{to("fullName")}</Label>
                      <Input
                        id="name"
                        {...register("name")}
                        placeholder={to("fullNamePlaceholder")}
                        error={errors.name?.message ?? issues?.name?.[0]}
                      />
                    </Field>

                    <Field>
                      <Label htmlFor="username">{to("username")}</Label>
                      <Input
                        id="username"
                        {...register("username")}
                        placeholder={to("usernamePlaceholder")}
                        autoComplete="username"
                        error={
                          errors.username?.message ?? issues?.username?.[0]
                        }
                      />
                    </Field>

                    <Field>
                      <Label htmlFor="password">{to("password")}</Label>
                      <Input
                        id="password"
                        type="password"
                        {...register("password")}
                        placeholder={to("passwordPlaceholder")}
                        autoComplete="new-password"
                        error={
                          errors.password?.message ?? issues?.password?.[0]
                        }
                      />
                    </Field>

                    <Button
                      type="button"
                      size="lg"
                      className="w-full"
                      disabled={!accountStepValid}
                      onClick={() => void nextToAcademicStep()}
                    >
                      {t("nextStep")}
                    </Button>

                    <div className="flex flex-col gap-1 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={clearAuthSession}
                      >
                        {to("relinkTelegram")}
                      </Button>
                      <p className="pt-1 text-center text-sm text-muted">
                        {t("haveAccountLogin")}{" "}
                        <Link
                          href="/login"
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {t("login")}
                        </Link>
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <form
                  onSubmit={(e) => void handleSubmit(onSubmit)(e)}
                  className="space-y-4"
                  noValidate
                >
                  <Link
                    href="/"
                    className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-all duration-200 ease-in-out hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {to("backToHome")}
                  </Link>

                  <div className="pb-1">
                    <h1 className="text-2xl font-bold tracking-tight">
                      {to("title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                      {to("subtitleWithTelegram")}
                    </p>
                  </div>

                  {globalError && <ErrorBanner>{globalError}</ErrorBanner>}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <Label htmlFor="year">{to("grade")}</Label>
                      <Select
                        id="year"
                        options={YEARS.map((y) => ({
                          value: y.value,
                          label: localize(y.label, locale),
                        }))}
                        placeholder={to("gradePlaceholder")}
                        value={watchedYear}
                        onChange={(e) => resetAfterYear(e.target.value)}
                        error={errors.year?.message ?? issues?.year?.[0]}
                      />
                    </Field>

                    <Field>
                      <Label htmlFor="system">{to("system")}</Label>
                      <Select
                        id="system"
                        options={systemOptions.map((s) => ({
                          value: s.value,
                          label: localize(s.label, locale),
                        }))}
                        placeholder={
                          watchedYear
                            ? to("systemPlaceholder")
                            : to("systemFirst")
                        }
                        value={watchedSystem}
                        disabled={!watchedYear}
                        onChange={(e) => resetAfterSystem(e.target.value)}
                        error={
                          errors.system?.message ?? issues?.system?.[0]
                        }
                      />
                    </Field>
                  </div>

                  {isBaccalaureate ? (
                    <>
                      <Field>
                        <Label htmlFor="track">{to("track")}</Label>
                        <Select
                          id="track"
                          options={trackOptions.map((tr) => ({
                            value: tr.value,
                            label: localize(tr.label, locale),
                          }))}
                          placeholder={to("trackPlaceholder")}
                          value={watchedTrack}
                          onChange={(e) => {
                            setSelect("track", e.target.value);
                            setSelect("electiveSubject", "");
                            void trigger();
                          }}
                          error={
                            errors.track?.message ?? issues?.track?.[0]
                          }
                        />
                      </Field>

                      {watchedTrack && (
                        <Field>
                          <Label htmlFor="elective">{to("elective")}</Label>
                          <Select
                            id="elective"
                            options={electiveOptions.map((el) => ({
                              value: el.value,
                              label: localize(el.label, locale),
                            }))}
                            placeholder={to("electivePlaceholder")}
                            value={watchedElective}
                            onChange={(e) => {
                              setSelect("electiveSubject", e.target.value);
                              void trigger();
                            }}
                            error={
                              errors.electiveSubject?.message ??
                              issues?.electiveSubject?.[0]
                            }
                          />
                        </Field>
                      )}
                    </>
                  ) : (
                    sectionOptions.length > 0 && (
                      <Field>
                        <Label htmlFor="section">{to("section")}</Label>
                        <Select
                          id="section"
                          options={sectionOptions.map((s) => ({
                            value: s.value,
                            label: localize(s.label, locale),
                          }))}
                          placeholder={to("sectionPlaceholder")}
                          value={watchedSection}
                          onChange={(e) => {
                            setSelect("section", e.target.value);
                            void trigger();
                          }}
                          error={
                            errors.section?.message ?? issues?.section?.[0]
                          }
                        />
                      </Field>
                    )
                  )}

                  {subjects.length > 0 && (
                    <div className="rounded-lg border border-border bg-surface-muted px-3.5 py-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                        <BookOpenText className="h-3.5 w-3.5" />
                        {to("yourSubjects")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {subjects.map((key) => (
                          <span
                            key={key}
                            className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-foreground"
                          >
                            {subjectLabel(key, isAr ? "ar" : "en")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!watchedSection &&
                    !isBaccalaureate &&
                    sectionOptions.length === 0 && (
                      <p className="text-xs text-muted">
                        {to("noSectionNeeded")}
                      </p>
                    )}

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      loading={busy}
                      disabled={busy}
                    >
                      {busy ? to("saving") : t("createAccountCta")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="w-full"
                      onClick={() => setStep(STEPS[1])}
                    >
                      {t("backStep")}
                    </Button>
                  </div>

                  <p className="text-center text-xs text-muted">
                    {to("agreeNote")}
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}