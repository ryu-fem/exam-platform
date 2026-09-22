"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { finalUsername } from "@/lib/config";

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (data: TelegramAuthData) => void;
  }
}

const SCRIPT_ID = "telegram-widget-script";

export function TelegramLoginButton({ onAuth }: { onAuth: (data: TelegramAuthData) => void }) {
  const t = useTranslations("auth");
  const onAuthRef = useRef(onAuth);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onAuthRef.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    if (!finalUsername) return;

    // Callback that Telegram widget calls after user approves
    window.onTelegramAuth = (data: TelegramAuthData) => {
      onAuthRef.current(data);
    };

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", finalUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-radius", "8");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      window.onTelegramAuth = undefined;
    };
  }, []);

  const handleClick = () => {
    // Click the real Telegram widget button inside the hidden container
    const iframe = containerRef.current?.querySelector("iframe");
    if (iframe) {
      (iframe as HTMLIFrameElement).click();
    }
  };

  if (!finalUsername) {
    return (
      <div className="flex w-full max-w-sm items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <Send className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="text-sm">{t("telegramNotConfigured")}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm">
      {/* Hidden real Telegram widget */}
      <div
        ref={containerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
      />

      {/* Custom styled button (on top) */}
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-neutral-900 transition-all duration-200 ease-in-out hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
      >
        <Send className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="text-sm font-medium">{t("loginWithTelegram")}</span>
      </button>
    </div>
  );
}