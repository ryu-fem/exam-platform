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
 * Official, native Telegram Login Button rendered by Telegram's widget script
 * (telegram-widget.js). The widget anchors on a `script[data-telegram-login]`
 * tag and injects its official iframe in its place, so we append the script
 * synchronously into a dedicated ref-owned container inside `useEffect`.
 *
 * The raw payload is sent to the server (/api/auth/telegram) which re-verifies
 * the HMAC signature — the client is never trusted silently.
 */
export function TelegramLoginButton({ onAuth }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onAuthRef = useRef(onAuth);
  const locale = useLocale();

  // Keep the callback fresh without re-mounting the widget: parents pass inline
  // arrows whose identity changes every render, and re-running the script
  // append on each render is what makes the button disappear.
  useEffect(() => {
    onAuthRef.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous instances to prevent duplicates or rendering bugs.
    container.innerHTML = "";

    // Expose the global function Telegram expects to invoke on approval.
    window.onTelegramAuth = (user: TelegramAuthData) => {
      if (user && user.hash) {
        onAuthRef.current(user);
      }
    };

    // Create and configure the official synchronous widget script.
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", TELEGRAM_BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-lang", locale.startsWith("ar") ? "ar" : "en");

    // Append directly to our container ref so the widget's iframe renders
    // exactly where it belongs.
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      window.onTelegramAuth = undefined;
    };
  }, [locale]);

  return (
    <div className="flex w-full min-h-[50px] items-center justify-center py-4">
      {/* Official Telegram Widget Container Anchor */}
      <div ref={containerRef} />
    </div>
  );
}