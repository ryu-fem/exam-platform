"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { ArrowLeft, BookOpenText, Check, Loader2, Send } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label, Field } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/Alert";
import { Link, useRouter } from "@/i18n/navigation";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import {
  TelegramLoginButton,
  type TelegramAuthData,
} from "@/components/TelegramLoginButton";
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

const TELEGRAM_TOKEN_KEY = "telegram_onboarding_token";
const TELEGRAM_PROFILE_KEY = "telegram_onboarding_profile";

const STEPS = [
  { labelKey: "stepOne", pct: 10 },
  { labelKey: "stepTwo", pct: 45 },
  { labelKey: "stepThree", pct: 80 },
] as const;

type Step = (typeof STEPS)[number];

type TelegramProfile = {
  name: string;
  username: string;
  photoUrl: string;
};

type TelegramApiResponse = {
  ok: boolean;
  action?: "signin" | "onboarding";
  target?: string;
  telegramId?: string;
  token?: string;
  profile?: TelegramProfile;
  error?: string;
};

type Issues = Record<string, string[] | undefined>;

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

function readSession(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function readProfileFromStorage(): TelegramProfile {
  const raw = readSession(TELEGRAM_PROFILE_KEY);
  if (!raw) return { name: "", username: "", photoUrl: "" };
  try {
    const parsed = JSON.parse(raw) as Partial<TelegramProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      username: typeof parsed.username === "string" ? parsed.username : "",
      photoUrl: typeof parsed.photoUrl === "string" ? parsed.photoUrl : "",
    };
  } catch {
    return { name: "", username: "", photoUrl: "" };
  }
}

export function RegistrationWizard({ resume }: { resume?: boolean }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("auth");
  const to = useTranslations("onboarding");
  const tc = useTranslations("common");
  const isAr = locale === "ar";

  const [step, setStep] = useState<Step>(STEPS[0]);
  const [token, setToken] = useState(() => readSession(TELEGRAM_TOKEN_KEY));
  const [profile, setProfile] = useState<TelegramProfile>(() =>
    readProfileFromStorage(),
  );
  const [tgState, setTgState] = useState<
    "idle" | "verifying" | "verified" | "error"
  >("idle");
  const [tgError, setTgError] = useState("");

  const [usernameTaken, setUsernameTaken] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [issues, setIssues] = useState<Issues>({});
  const [busy, setBusy] = useState(false);

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
      name: profile.name,
      username: profile.username,
      password: "",
      year: "",
      system: "",
      section: "",
      track: "",
      electiveSubject: "",
    },
  });

  // Resume an in-progress registration on /onboarding when a token exists.
  useEffect(() => {
    if (!resume) return;
    const savedToken = readSession(TELEGRAM_TOKEN_KEY);
    if (savedToken) {
      const savedProfile = readProfileFromStorage();
      setProfile(savedProfile);
      setToken(savedToken);
      setStep(STEPS[1]);
      reset({
        name: savedProfile.name,
        username: savedProfile.username,
        password: "",
        year: "",
        system: "",
        section: "",
        track: "",
        electiveSubject: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleTelegramAuth = async (data: TelegramAuthData) => {
    setTgState("verifying");
    setTgError("");
    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as TelegramApiResponse;

      if (!json.ok) {
        setTgState("error");
        setTgError(json.error ?? t("telegramAuthFailed"));
        return;
      }

      if (json.action === "onboarding" && json.token) {
        const savedProfile: TelegramProfile = {
          name: json.profile?.name ?? "",
          username: json.profile?.username ?? "",
          photoUrl: json.profile?.photoUrl ?? "",
        };
        try {
          window.sessionStorage.setItem(TELEGRAM_TOKEN_KEY, json.token);
          window.sessionStorage.setItem(
            TELEGRAM_PROFILE_KEY,
            JSON.stringify(savedProfile),
          );
        } catch {
          // Storage unavailable — keep the values in memory for this session.
        }
        setToken(json.token);
        setProfile(savedProfile);
        setTgState("verified");
        return;
      }

      if (json.action === "signin") {
        await signIn("telegram", {
          redirect: false,
          telegramId: json.telegramId,
        });
        router.push(json.target ?? "/dashboard");
        return;
      }

      setTgState("error");
      setTgError(t("telegramAuthFailed"));
    } catch {
      setTgState("error");
      setTgError(tc("tryAgain"));
    }
  };

  const nextToForm = async () => {
    const ok = await trigger(["name", "username", "password"]);
    if (ok) setStep(STEPS[1]);
  };

  const onSubmit = async (values: OnboardingValues) => {
    setBusy(true);
    setGlobalError("");
    setIssues({});

    if (!token) {
      setGlobalError(t("telegramAuthRequired"));
      setBusy(false);
      return;
    }

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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        issues?: Issues;
      };

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
        window.sessionStorage.removeItem(TELEGRAM_TOKEN_KEY);
        window.sessionStorage.removeItem(TELEGRAM_PROFILE_KEY);
      } catch {
        // ignore
      }
      router.push("/verify");
    } catch {
      setGlobalError(tc("tryAgain"));
      setBusy(false);
    }
  };

  const isBaccalaureate = watchedSystem === "baccalaureate";
  const step2Valid = !(errors.name || errors.username || errors.password);
  const verified = tgState === "verified";

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

          {step === STEPS[0] ? (
            <Card>
              <CardContent className="space-y-6 pt-8">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Logo showText={false} size={56} />
                  <h1 className="text-2xl font-bold tracking-tight">
                    {t("registerStepTitle")}
                  </h1>
                  <p className="max-w-xs text-sm text-muted">
                    {t("registerStepSubtitle")}
                  </p>
                </div>

                {tgState === "verifying" && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("verifying")}
                  </div>
                )}

                {tgState === "error" && (
                  <div className="space-y-4">
                    <ErrorBanner>{tgError}</ErrorBanner>
                    <div className="flex justify-center">
                      <TelegramLoginButton
                        label={t("telegramLogIn")}
                        onAuth={(d) => void handleTelegramAuth(d)}
                        onCancel={() => {
                          setTgState("error");
                          setTgError(t("telegramPopupCancelled"));
                        }}
                        onBlocked={() => {
                          setTgState("error");
                          setTgError(t("telegramPopupBlocked"));
                        }}
                        onConfigError={() => {
                          setTgState("error");
                          setTgError(t("telegramNotConfigured"));
                        }}
                      />
                    </div>
                  </div>
                )}

                {tgState === "idle" && (
                  <div className="flex flex-col items-center gap-3">
                    <TelegramLoginButton
                      label={t("telegramLogIn")}
                      onAuth={(d) => void handleTelegramAuth(d)}
                      onCancel={() => {
                        setTgState("error");
                        setTgError(t("telegramPopupCancelled"));
                      }}
                      onBlocked={() => {
                        setTgState("error");
                        setTgError(t("telegramPopupBlocked"));
                      }}
                      onConfigError={() => {
                        setTgState("error");
                        setTgError(t("telegramNotConfigured"));
                      }}
                    />
                  </div>
                )}

                {verified && (
                  <>
                    <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success-muted px-3.5 py-3">
                      {profile.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.photoUrl}
                          alt={profile.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 font-bold text-accent">
                          {profile.name?.charAt(0) || <Send className="h-5 w-5" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {profile.name && (
                          <p className="truncate text-sm font-medium text-foreground">
                            {profile.name}
                          </p>
                        )}
                        {profile.username && (
                          <p className="truncate text-xs text-muted">
                            @{profile.username}
                          </p>
                        )}
                      </div>
                      <Check className="h-5 w-5 shrink-0 text-success" />
                    </div>

                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => setStep(STEPS[1])}
                    >
                      {t("nextStep")}
                    </Button>
                  </>
                )}

                <p className="text-center text-sm text-muted">
                  {t("haveAccountLogin")}{" "}
                  <Link
                    href="/login"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {t("login")}
                  </Link>
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="px-5 pt-5 sm:px-6">
                <Link
                  href="/"
                  className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-all duration-200 ease-in-out hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  {to("backToHome")}
                </Link>
                {step === STEPS[1] ? (
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {t("accountStepTitle")}
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                      {t("accountStepSubtitle")}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {to("title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                      {to("subtitleWithTelegram")}
                    </p>
                  </div>
                )}
              </div>

              {profile.name || profile.photoUrl ? (
                <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success-muted px-3.5 py-2.5 text-sm text-success sm:mx-6">
                  <Check className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {to("telegramLinked")}
                    {profile.name ? ` — ${profile.name}` : ""}
                  </span>
                </div>
              ) : null}

              <CardContent>
                <form
                  onSubmit={(e) => void handleSubmit(onSubmit)(e)}
                  className="space-y-4"
                  noValidate
                >
                  {globalError && <ErrorBanner>{globalError}</ErrorBanner>}

                  {step === STEPS[1] ? (
                    <>
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

                      <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
                        <Button
                          type="button"
                          size="lg"
                          className="w-full"
                          disabled={!step2Valid}
                          onClick={() => void nextToForm()}
                        >
                          {t("nextStep")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="lg"
                          className="w-full"
                          onClick={() => setStep(STEPS[0])}
                        >
                          {t("backStep")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}