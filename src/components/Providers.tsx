"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { QueryProvider } from "@/components/QueryProvider";
import { AuthSync } from "@/components/AuthSync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <QueryProvider>
          <AuthSync />
          {children}
        </QueryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}