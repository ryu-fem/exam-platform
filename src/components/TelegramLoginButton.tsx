"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Loader2, Send } from "lucide-react";
import { telegramBotIdConfigured, finalBotIdNumber } from "@/lib/config";
import { cn } from "@/lib/utils";

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
    Telegram?: {
      Login?: {
        auth: (
          options: {
            bot_id: number;
            origin?: string;
            request_access?: string;
            lang?: string;
            embed?: number;
          },
          callback: (user: TelegramAuthData | null) => void,
        ) => void;
      };
    };
  }
}

const SCRIPT_SRC = "https://telegram.org/js/telegram-login.js?22";

type Status = "idle" | "loading";

export function TelegramLoginButton({
  label,
  disabled,
  onAuth,
  onCancel,
  onBlocked,
  onConfigError,
}: {
  label: string;
  disabled?: boolean;
  onAuth: (data: TelegramAuthData) => void;
  onCancel?: () => void;
  onBlocked?: () => void;
  onConfigError?: () => void;
}) {
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [scriptFailed, setScriptFailed] = useState(false);
  const resolvedRef = useRef(false);

  const configured = telegramBotIdConfigured();

  // Load the official Login widget script once. It exposes `Telegram.Login.auth`
  // which opens the OAuth popup and delivers the signed auth payload.
  useEffect(() => {
    let cancelled = false;

    if (document.getElementById("telegram-login-script")) {
      const timer = window.setTimeout(() => {
        if (!cancelled) setScriptFailed(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    const script = document.createElement("script");
    script.id = "telegram-login-script";
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (!cancelled) setScriptFailed(false);
    };
    script.onerror = () => {
      if (!cancelled) setScriptFailed(true);
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = () => {
    if (!configured) {
      onConfigError?.();
      return;
    }
    if (scriptFailed || !window.Telegram?.Login?.auth) {
      onConfigError?.();
      return;
    }

    resolvedRef.current = false;
    setStatus("loading");

    const openedAt = Date.now();
    let settled = false;
    let blockedTimer: number | undefined = undefined;

    const settle = (cb: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(blockedTimer);
      window.removeEventListener("focus", handleFocusReturn);
      setStatus("idle");
      cb();
    };

    const handleFocusReturn = () => {
      // Focus came back to our window without a result: the popup was closed.
      if (resolvedRef.current) return;
      // A very fast return usually means the popup never opened (was blocked).
      settle(() =>
        Date.now() - openedAt >= 400 ? onCancel?.() : onBlocked?.(),
      );
    };

    // If the window never loses focus, the popup was likely blocked.
    blockedTimer = window.setTimeout(() => {
      if (resolvedRef.current) return;
      if (!document.hasFocus()) return;
      settle(() => onBlocked?.());
    }, 1500);

    window.addEventListener("focus", handleFocusReturn);

    window.Telegram.Login.auth(
      {
        bot_id: finalBotIdNumber,
        origin: window.location.origin,
        request_access: "write",
        lang: locale,
      },
      (user) => {
        resolvedRef.current = true;
        settle(() => {
          if (user && typeof user.id === "number" && user.hash) {
            onAuth(user);
          } else {
            onCancel?.();
          }
        });
      },
    );
  };

  if (scriptFailed || !configured) {
    return (
      <div className="flex w-full max-w-sm items-center justify-center rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        {label}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || status === "loading"}
      className={cn(
        "inline-flex h-12 w-full max-w-sm items-center justify-center gap-2.5 rounded-xl px-6 text-base font-medium text-white",
        "bg-[#54a9eb] transition-colors duration-200 ease-in-out hover:bg-[#3a94d8]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#54a9eb]/40",
      )}
    >
      {status === "loading" ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Send className="h-5 w-5" />
      )}
      {label}
    </button>
  );
}