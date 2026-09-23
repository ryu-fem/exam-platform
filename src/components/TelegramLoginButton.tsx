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
            request_access?: string;
            lang?: string;
          },
          callback: (user: TelegramAuthData | null) => void,
        ) => void;
      };
    };
  }
}

// السكريبت الأكثر استقراراً للنوافذ المنبثقة والمطابق للتوثيق الرسمي
const SCRIPT_SRC = "https://telegram.org";

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

  useEffect(() => {
    let cancelled = false;

    if (document.getElementById("telegram-login-script")) {
      if (!cancelled) setScriptFailed(false);
      return;
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
      if (resolvedRef.current) return;
      // ننتظر قليلاً للتأكد من أن المستخدم أغلق النافذة بنفسه ولم يتم حظرها فوراً
      settle(() =>
        Date.now() - openedAt >= 500 ? onCancel?.() : onBlocked?.(),
      );
    };

    blockedTimer = window.setTimeout(() => {
      if (resolvedRef.current) return;
      if (!document.hasFocus()) return;
      settle(() => onBlocked?.());
    }, 2000);

    window.addEventListener("focus", handleFocusReturn);

    try {
      // إزالة حقل origin تماماً لحل تعارض المتصفح وتمرير الحقول الأساسية فقط
      window.Telegram.Login.auth(
        {
          bot_id: finalBotIdNumber,
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
    } catch (err) {
      console.error("Telegram popup error:", err);
      settle(() => onBlocked?.());
    }
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
