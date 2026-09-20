"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label, Field } from "@/components/ui/Field";
import { ErrorBanner } from "@/components/ui/Alert";
import { TelegramLoginButton, type TelegramAuthData } from "@/components/TelegramLoginButton";
import { Link, useRouter } from "@/i18n/navigation";

type ApiResponse = {
  ok: boolean;
  action?: "signin" | "onboarding" | "redirect";
  target?: string;
  telegramId?: string;
  error?: string;
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tgBusy, setTgBusy] = useState(false);

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

    setError("Invalid username or password.");
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
        setError(json.error ?? "Authentication failed.");
        setTgBusy(false);
        return;
      }

      if (json.action === "onboarding" || json.action === "redirect") {
        router.push(json.target!);
        return;
      }

      await signIn("telegram", { redirect: false, telegramId: json.telegramId });
      router.push(json.target ?? "/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setTgBusy(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Login</h1>
              <p className="text-sm text-muted">Welcome back</p>
            </CardHeader>
            <CardContent>
              {error && <ErrorBanner>{error}</ErrorBanner>}

              <div className="flex flex-col items-center gap-3">
                {tgBusy ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </div>
                ) : (
                  <TelegramLoginButton onAuth={(d) => void handleTelegram(d)} />
                )}
              </div>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted">OR</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Field>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    autoComplete="username"
                  />
                </Field>
                <Field>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                  />
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={busy}>
                  {busy ? "Signing in…" : "Login"}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted">
                No account yet?{" "}
                <Link
                  href="/register"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Create account
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