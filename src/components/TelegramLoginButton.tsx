"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTelegramOidcInit } from "@/hooks/use-telegram-oidc";

/**
 * Official Telegram OpenID Connect login button.
 *
 * Replaces the legacy third-party iframe widget (whose oauth iframe + its
 * cookies could be blocked by strict browsers on free hosting). On click the
 * OIDC flow starts server-side: /api/telegram/oidc/init pins the CSRF
 * state / PKCE verifier / anti-replay nonce as httpOnly cookies and returns
 * the official oauth.telegram.org authorization URL, which we open in the
 * same tab. The user approves in Telegram, Telegram redirects back to
 * /api/telegram/oidc/callback where the code is exchanged and verified, and
 * the browser is routed to the dashboard (or /register for new students).
 * No third-party script or iframe is involved anywhere.
 */
export function TelegramLoginButton() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [error, setError] = useState("");
  const oidcInit = useTelegramOidcInit();

  const handleOidcLogin = async () => {
    setError("");
    try {
      const result = await oidcInit.mutateAsync();
      if (!result.ok || !result.url) {
        setError(
          result.error === "not_configured"
            ? t("oidcNotConfigured")
            : tc("tryAgain"),
        );
        return;
      }
      window.location.href = result.url;
    } catch {
      setError(tc("tryAgain"));
    }
  };

  return (
    <div className="flex w-full min-h-[50px] flex-col items-center justify-center gap-2 py-4">
      <button
        type="button"
        onClick={() => void handleOidcLogin()}
        disabled={oidcInit.isPending}
        className="inline-flex h-12 w-full max-w-sm items-center justify-center gap-2.5 rounded-xl px-6 text-base font-medium text-white transition-colors duration-200 shadow-md bg-[#54a9eb] hover:bg-[#3a94d8] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {oidcInit.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
        {oidcInit.isPending
          ? t("verifying")
          : t("telegramOidcButton")}
      </button>

      {error && (
        <p className="max-w-xs text-center text-sm text-foreground">{error}</p>
      )}
    </div>
  );
}