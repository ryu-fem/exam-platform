"use client";

import { useMutation } from "@tanstack/react-query";

import type { TelegramAuthData } from "@/lib/telegram";

export type TelegramAuthResponse = {
  ok: boolean;
  action?: "signin" | "onboarding" | "redirect";
  target?: string;
  telegramId?: string;
  token?: string;
  profile?: { name?: string; username?: string; photoUrl?: string };
  error?: string;
};

/**
 * Shared TanStack Query mutation for the Telegram Login Widget flow. Both the
 * login page and the registration wizard post the signed widget payload to
 * `/api/auth/telegram` (which re-verifies the HMAC signature server-side);
 * this dedupes that request into one cache-aware, retryable mutation.
 */
export function useTelegramAuth() {
  return useMutation({
    mutationFn: async (data: TelegramAuthData): Promise<TelegramAuthResponse> => {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return (await res.json()) as TelegramAuthResponse;
    },
  });
}