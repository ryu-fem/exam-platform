"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label, Field } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/Alert";
import { Link, useRouter } from "@/i18n/navigation";
import { AnimatedBackground } from "@/components/AnimatedBackground";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Maps the error surfaced by `signIn("credentials", { redirect: false })`
  // to a human-readable message. The account-status errors are thrown from
  // the authorize() callback in src/lib/auth.ts and flow through NextAuth's
  // `error` query parameter.
  const translateSignInError = (raw: string | null | undefined): string => {
    if (!raw || raw === "CredentialsSignin") {
      return t("invalidCredentials");
    }
    if (raw.includes("pending admin approval")) {
      return t("pendingApproval");
    }
    if (raw.includes("was rejected")) {
      return t("rejectedAccount");
    }
    if (raw.includes("not active")) {
      return t("inactiveAccount");
    }
    return raw;
  };

  const resolveTarget = async (fallback: string) => {
    try {
      const res = await fetch("/api/me");
      const json = (await res.json()) as {
        ok: boolean;
        user?: { role: string; status: string };
        verification?: unknown;
      };
      if (!json.ok || !json.user) return fallback;
      if (json.user.role === "admin") return "/admin";
      if (json.user.status === "active") return fallback;
      if (json.user.status === "rejected") return "/verify";
      return json.verification ? "/pending" : "/verify";
    } catch {
      return fallback;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      username,
      password,
    });

    if (!result?.error) {
      const target = await resolveTarget(callbackUrl);
      router.push(target);
      return;
    }

    setError(translateSignInError(result.error));
    setBusy(false);
  };

  return (
    <>
      <Navbar />
      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <AnimatedBackground />
        <div className="relative z-10 w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">{t("loginTitle")}</h1>
              <p className="text-sm text-muted">{t("loginSubtitle")}</p>
            </CardHeader>
            <CardContent>
              {error && <ErrorBanner>{error}</ErrorBanner>}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Field>
                  <Label htmlFor="username">{t("username")}</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("usernamePlaceholder")}
                    autoComplete="username"
                  />
                </Field>
                <Field>
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    autoComplete="current-password"
                  />
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={busy}>
                  {busy ? t("signingIn") : t("login")}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted">
                {t("noAccount")}{" "}
                <Link
                  href="/register"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {t("createAccount")}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}