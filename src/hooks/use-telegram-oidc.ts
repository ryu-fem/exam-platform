"use client";

import { useMutation } from "@tanstack/react-query";

export type TelegramOidcInitResponse = {
  ok: boolean;
  url?: string;
  error?: "not_configured" | "invalid_request" | string;
};

/**
 * TanStack Query mutation that starts the Telegram OIDC authorization flow.
 * Calls our /oidc/init route which pins the CSRF state / PKCE verifier / nonce
 * as httpOnly cookies and returns the official oauth.telegram.org URL for the
 * browser to open.
 */
export function useTelegramOidcInit() {
  return useMutation({
    mutationFn: async (): Promise<TelegramOidcInitResponse> => {
      const res = await fetch("/api/telegram/oidc/init", {
        cache: "no-store",
      });
      return (await res.json()) as TelegramOidcInitResponse;
    },
  });
}