"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";

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
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

// Official widget script. The widget reads the `data-*` attributes from the
// exact same <script> element and replaces it with the Telegram-hosted button.
const WIDGET_SCRIPT = "https://telegram.org/js/telegram-login.js";

export function TelegramLoginButton({
  onAuth,
}: {
  label?: string;
  disabled?: boolean;
  onAuth: (data: TelegramAuthData) => void;
  onCancel?: () => void;
  onBlocked?: () => void;
  onConfigError?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  // Keep the latest callback/locale in refs so the widget is created exactly
  // once (mount) and never rebuilt on parent re-renders even when callers pass
  // inline arrow functions.
  const onAuthRef = useRef(onAuth);
  const localeRef = useRef(locale);
  useEffect(() => {
    onAuthRef.current = onAuth;
    localeRef.current = locale;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any previous instances to avoid duplicate widgets.
    container.innerHTML = "";

    // Global callback the widget calls on successful login.
    window.onTelegramAuth = (user: TelegramAuthData) => {
      if (user && user.hash) {
        onAuthRef.current(user);
      }
    };

    // Insert the official widget via its standard script-tag method.
    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT;
    script.setAttribute("data-telegram-login", "hejqdadbot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-lang", localeRef.current === "ar" ? "ar" : "en");
    script.async = true;
    container.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      container.innerHTML = "";
    };
  }, []);

  return (
    <div className="flex w-full justify-center py-2">
      <div ref={containerRef} id="telegram-widget-container" />
    </div>
  );
}