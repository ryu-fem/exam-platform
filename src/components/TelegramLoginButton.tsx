"use client";

import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Force wipe the internal HTML to clean up any leaking React state or duplicate triggers
    containerRef.current.innerHTML = "";

    // 2. Bind the globally required authorization callback invoked directly by Telegram's runtime
    window.onTelegramAuth = (user: TelegramAuthData) => {
      if (user && user.hash) {
        onAuth(user);
      }
    };

    // 3. Construct and mount the official synchronous Telegram widget script tag.
    //    The URL MUST be the widget script (telegram-login.js) — a bare
    //    "<https://telegram.org>" src never loads, and the button disappears.
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-login.js";
    script.setAttribute("data-telegram-login", "hejqdadbot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-lang", "ar");
    script.async = true;

    containerRef.current.appendChild(script);

    return () => {
      // Cleanup global binding on unmount
      delete window.onTelegramAuth;
    };
  }, [onAuth]);

  return (
    <div className="flex w-full justify-center items-center py-4">
      <div ref={containerRef} />
    </div>
  );
}