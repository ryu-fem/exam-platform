"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { TelegramLoginButton, type TelegramAuthData } from "@/components/TelegramLoginButton";
import { Alert } from "@/components/ui/Alert";
import { useRouter } from "@/i18n/navigation";
import { AnimatedBackground } from "@/components/AnimatedBackground";

type ApiResponse = {
  ok: boolean;
  action?: "signin" | "onboarding" | "redirect";
  target?: string;
  telegramId?: string;
  error?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async (data: TelegramAuthData) => {
    setBusy(true);
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
        setBusy(false);
        return;
      }

      if (json.action === "onboarding") {
        router.push(json.target!);
        return;
      }

      if (json.action === "signin") {
        await signIn("telegram", { redirect: false, telegramId: json.telegramId });
      }

      router.push(json.target ?? "/dashboard");
    } catch {
      setError(tc("tryAgain"));
      setBusy(false);
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
              <h1 className="text-2xl font-bold tracking-tight">{t("registerTitle")}</h1>
              <p className="text-sm text-muted">{t("registerSubtitle")}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {error && <Alert variant="danger">{error}</Alert>}

                <div className="flex flex-col items-center gap-3">
                  {busy ? (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("verifying")}
                    </div>
                  ) : (
                    <TelegramLoginButton
                      onAuth={(d) => {
                        void handleAuth(d);
                      }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}