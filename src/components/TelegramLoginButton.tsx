"use client";

import { useEffect, useRef } from "react";
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
    ExamPlatformTelegramAuth?: (data: TelegramAuthData) => void;
  }
}

const SCRIPT_ID = "telegram-widget-script";

export function TelegramLoginButton({ onAuth }: { onAuth: (data: TelegramAuthData) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);

  useEffect(() => {
    onAuthRef.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    if (!finalUsername) return;

    (window as unknown as Record<string, unknown>).ExamPlatformTelegramAuth = (
      data: TelegramAuthData,
    ) => onAuthRef.current(data);

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = finalUsername;
    script.dataset.size = "large";
    script.dataset.widgetVersion = "22";
    script.dataset.onauth = "ExamPlatformTelegramAuth";

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
      const el = document.getElementById(SCRIPT_ID);
      if (el) el.remove();
    };
  }, []);

  if (!finalUsername) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-muted">
        <Send className="h-4 w-4" />
        Login with Telegram is not configured yet
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}