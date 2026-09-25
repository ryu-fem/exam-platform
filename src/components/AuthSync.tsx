"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { useAuthStore } from "@/store/useAuthStore";

/**
 * Bridges the NextAuth session into the global Zustand auth store. Runs once
 * per session change on the client; SSR never touches the store, so there is
 * no hydration flash — server-rendered components keep receiving their user
 * as props for the first paint.
 */
export function AuthSync() {
  const { data: session, status } = useSession();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const u = session.user as Record<string, unknown> & {
        name?: string | null;
      };
      setUser({
        id: typeof u.id === "string" ? u.id : null,
        name: u.name ?? null,
        username: typeof u.username === "string" ? u.username : null,
        telegramId: typeof u.telegramId === "string" ? u.telegramId : null,
        role: typeof u.role === "string" ? u.role : null,
        status: typeof u.status === "string" ? u.status : null,
      });
    } else {
      setUser(null);
    }
  }, [session, status, setUser]);

  return null;
}