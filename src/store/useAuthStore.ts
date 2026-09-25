"use client";

import { create } from "zustand";

/**
 * Minimal global auth store (Zustand). Mirrors the client session so any
 * component can read the signed-in user / session status without prop-drilling
 * or subscribing to `useSession` itself. The store is hydrated by <AuthSync>
 * from the NextAuth session inside the root Providers.
 */
export type AuthUser = {
  id?: string | null;
  name?: string | null;
  username?: string | null;
  telegramId?: string | null;
  role?: string | null;
  status?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));