"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";

import { TELEGRAM_BOT_USERNAME } from "@/lib/config";
import type { TelegramAuthData } from "@/lib/telegram";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

type Props = {
  onAuth: (user: TelegramAuthData) => void;
};

/**
 * Official Telegram Login Widget (native script embed). The widget button is
 * rendered in-place by telegram-login.js; the callback is exposed on
 * `window.onTelegramAuth` exactly as the widget expects. The raw payload is
 * sent to the server which re-verifies the signature.
 */
export function TelegramLoginButton({ onAuth }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onAuthRef = useRef(onAuth);
  const locale = useLocale();

  useEffect(() => {
    onAuthRef.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    window.onTelegramAuth = (user) => {
      onAuthRef.current(user);
    };

    const container = containerRef.current;
    if (container) {
      container.innerHTML = "";
      const widget = document.createElement("div");
      container.appendChild(widget);

      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-login.js";
      script.async = true;
      script.dataset.telegramLogin = TELEGRAM_BOT_USERNAME;
      script.dataset.size = "large";
      script.dataset.radius = "10";
      script.dataset.lang = locale.startsWith("ar") ? "ar" : "en";
      widget.appendChild(script);
    }

    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [locale]);

  return <div ref={containerRef} className="flex justify-center" />;
}