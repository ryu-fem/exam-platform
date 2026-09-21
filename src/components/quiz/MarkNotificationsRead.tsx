"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { useRouter } from "@/i18n/navigation";

export function MarkNotificationsRead({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" loading={busy} onClick={onClick}>
      {children}
    </Button>
  );
}