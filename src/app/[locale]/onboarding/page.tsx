"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Label, Field } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/Alert";
import { Link, useRouter } from "@/i18n/navigation";
import { YEARS, SYSTEMS, TRACKS, ELECTIVES } from "@/lib/constants";

type Issues = Record<string, string[] | undefined>;

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const telegramId = searchParams.get("telegramId") ?? "";

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [year, setYear] = useState("");
  const [system, setSystem] = useState("");
  const [track, setTrack] = useState("");
  const [elective, setElective] = useState("");
  const [issues, setIssues] = useState<Issues>({});
  const [globalError, setGlobalError] = useState("");
  const [busy, setBusy] = useState(false);

  const systemOptions = useMemo(() => (year ? (SYSTEMS[year] ?? []) : []), [year]);
  const trackOptions = useMemo(() => (system === "baccalaureate" ? TRACKS : {}), [system]);
  const electiveOptions = useMemo(
    () => (track ? (ELECTIVES[track] ?? []) : []),
    [track],
  );

  const resetSystem = (nextYear: string) => {
    setYear(nextYear);
    setSystem("");
    setTrack("");
    setElective("");
  };

  const resetTrack = (nextSystem: string) => {
    setSystem(nextSystem);
    setTrack("");
    setElective("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setGlobalError("");
    setIssues({});

    const payload: Record<string, string> = {
      name,
      username,
      password,
      year,
      system,
    };
    if (telegramId) payload.telegramId = telegramId;
    if (track) payload.track = track;
    if (elective) payload.electiveSubject = elective;

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        issues?: Issues;
        user?: { username: string };
      };

      if (!json.ok) {
        setGlobalError(json.error ?? "Something went wrong.");
        setIssues(json.issues ?? {});
        setBusy(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });

      if (signInRes?.error) {
        router.push("/login");
        return;
      }

      router.push("/verify");
    } catch {
      setGlobalError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            Back to home
          </Link>

          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
              <p className="text-sm text-muted">
                {telegramId
                  ? "Almost there — tell us a little about yourself."
                  : "Create your account and choose your study track."}
              </p>
            </CardHeader>
            <CardContent>
              {telegramId && (
                <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success-muted px-3.5 py-2.5 text-sm text-success">
                  <Check className="h-4 w-4 shrink-0" />
                  Telegram account linked.
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                {globalError && <ErrorBanner>{globalError}</ErrorBanner>}

                <Field>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    error={issues?.name?.[0]}
                  />
                </Field>

                <Field>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="A unique username"
                    autoComplete="username"
                    error={issues?.username?.[0]}
                  />
                </Field>

                <Field>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    error={issues?.password?.[0]}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="year">Grade / Year *</Label>
                    <Select
                      id="year"
                      options={YEARS.map((y) => ({ value: y.value, label: y.label }))}
                      placeholder="Select grade"
                      value={year}
                      onChange={(e) => resetSystem(e.target.value)}
                      error={issues?.year?.[0]}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="system">System *</Label>
                    <Select
                      id="system"
                      options={systemOptions}
                      placeholder={year ? "Select system" : "Select grade first"}
                      value={system}
                      disabled={!year}
                      onChange={(e) => resetTrack(e.target.value)}
                      error={issues?.system?.[0]}
                    />
                  </Field>
                </div>

                {system === "baccalaureate" && (
                  <>
                    <Field>
                      <Label htmlFor="track">Track *</Label>
                      <Select
                        id="track"
                        options={Object.values(trackOptions).flat().map((t) => ({
                          value: t.value,
                          label: t.label,
                        }))}
                        placeholder="Select track"
                        value={track}
                        onChange={(e) => {
                          setTrack(e.target.value);
                          setElective("");
                        }}
                        error={issues?.track?.[0]}
                      />
                    </Field>

                    {track && (
                      <Field>
                        <Label htmlFor="elective">Elective Subject *</Label>
                        <Select
                          id="elective"
                          options={electiveOptions.map((e) => ({
                            value: e.val,
                            label: e.label,
                          }))}
                          placeholder="Select elective"
                          value={elective}
                          onChange={(e) => setElective(e.target.value)}
                          error={issues?.electiveSubject?.[0]}
                        />
                      </Field>
                    )}
                  </>
                )}

                <div className="pt-2">
                  <Button type="submit" size="lg" className="w-full" loading={busy}>
                    {busy ? "Saving…" : "Continue"}
                  </Button>
                </div>

                <p className="text-center text-xs text-muted">
                  By continuing you agree to the platform rules. Membership is
                  reviewed before activation.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center" />}>
      <OnboardingForm />
    </Suspense>
  );
}