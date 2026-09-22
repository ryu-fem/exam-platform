"use client";

import { useEffect, useRef } from "react";
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

export function TelegramLoginButton({
  onAuth,
}: {
  onAuth: (data: TelegramAuthData) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!finalUsername) return;

    window.onTelegramAuth = (data: TelegramAuthData) => {
      onAuth(data);
    };

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", finalUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-userpic", "false");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      window.onTelegramAuth = undefined;
    };
  }, []);

  if (!finalUsername) {
    return (
      <div className="flex w-full max-w-sm items-center justify-center rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        Telegram غير مُهيأ
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}