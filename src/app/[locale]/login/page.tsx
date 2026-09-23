"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label, Field } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/Alert";
import { TelegramLoginButton, type TelegramAuthData } from "@/components/TelegramLoginButton";
import { Link, useRouter } from "@/i18n/navigation";
import { AnimatedBackground } from "@/components/AnimatedBackground";

type ApiResponse = {
  ok: boolean;
  action?: "signin" | "onboarding" | "redirect";
  target?: string;
  telegramId?: string;
  token?: string;
  profile?: { name?: string; username?: string; photoUrl?: string };
  error?: string;
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tgBusy, setTgBusy] = useState(false);

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

  const handleTelegram = async (data: TelegramAuthData) => {
    setTgBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as ApiResponse;

      if (!json.ok) {
        setError(json.error ?? t("telegramAuthFailed"));
        setTgBusy(false);
        return;
      }

      if (json.action === "onboarding") {
        // Resume the registration wizard with the token the server just issued.
        if (json.token) {
          try {
            window.sessionStorage.setItem(
              "telegram_onboarding_token",
              json.token,
            );
            window.sessionStorage.setItem(
              "telegram_onboarding_profile",
              JSON.stringify({
                name: json.profile?.name ?? "",
                username: json.profile?.username ?? "",
                photoUrl: json.profile?.photoUrl ?? "",
              }),
            );
          } catch {
            // ignore — storage is a convenience, not a requirement
          }
        }
        router.push("/register");
        return;
      }

      if (json.action === "redirect") {
        router.push(json.target!);
        return;
      }

      await signIn("telegram", { redirect: false, telegramId: json.telegramId });
      router.push(json.target ?? "/dashboard");
    } catch {
      setError(tc("tryAgain"));
      setTgBusy(false);
    }
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

              <div className="flex flex-col items-center gap-3">
                {tgBusy ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("signingIn")}
                  </div>
                ) : (
                  <TelegramLoginButton
                    label={t("telegramLogIn")}
                    onAuth={(d) => void handleTelegram(d)}
                    onCancel={() => setError(t("telegramPopupCancelled"))}
                    onBlocked={() => setError(t("telegramPopupBlocked"))}
                    onConfigError={() => setError(t("telegramNotConfigured"))}
                  />
                )}
              </div>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted">{t("orDivider")}</span>
                <span className="h-px flex-1 bg-border" />
              </div>

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