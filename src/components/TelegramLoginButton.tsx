"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { finalUsername, finalBotId } from "@/lib/config";

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

function oauthUrl(): string {
  const params = new URLSearchParams({
    bot_id: finalBotId,
    origin: window.location.origin,
    request_access: "write",
  });
  return `https://oauth.telegram.org/auth?${params.toString()}`;
}

export function TelegramLoginButton({ onAuth }: { onAuth: (data: TelegramAuthData) => void }) {
  const t = useTranslations("auth");
  const onAuthRef = useRef(onAuth);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onAuthRef.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    if (!finalUsername) return;

    window.onTelegramAuth = (data: TelegramAuthData) => onAuthRef.current(data);

    const el = document.getElementById(SCRIPT_ID);
    if (el) el.remove();

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = finalUsername;
    script.dataset.size = "large";
    script.dataset.widgetVersion = "22";
    script.dataset.onauth = "onTelegramAuth";
    script.dataset.requestAccess = "write";
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      const element = document.getElementById(SCRIPT_ID);
      if (element) element.remove();
      window.onTelegramAuth = undefined;
    };
  }, []);

  const handleClick = () => {
    if (!finalBotId) return;
    window.open(
      oauthUrl(),
      "telegram-oauth",
      "popup=1,width=440,height=560",
    );
  };

  if (!finalBotId) {
    return (
      <div className="flex w-full max-w-sm items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-neutral-500 transition-all duration-200 ease-in-out dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <Send className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="text-sm">{t("telegramNotConfigured")}</span>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        aria-hidden="true"
        className="pointer-events-none absolute opacity-0"
      />
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full max-w-sm items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-neutral-900 transition-all duration-200 ease-in-out hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
      >
        <Send className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="text-sm font-medium">{t("loginWithTelegram")}</span>
      </button>
    </>
  );
}