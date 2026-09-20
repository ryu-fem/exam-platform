"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "@/i18n/navigation";

type Status = {
  status: string;
  telegramId?: string;
};

export default function PendingPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const [userStatus, setUserStatus] = useState<Status | null>(null);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login");
  }, [authStatus, router]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/me");
        const json = (await res.json()) as {
          ok: boolean;
          user?: { status: string };
          verification?: { status: string } | null;
        };
        if (cancelled || !json.ok) return;

        setUserStatus({ status: json.user?.status ?? "pending" });
        setVerificationSubmitted(!!json.verification);

        if (json.user?.status === "active") {
          router.replace("/dashboard");
        } else if (json.user?.status === "rejected") {
          router.replace("/verify");
        } else if (!json.verification) {
          router.replace("/verify");
        }
      } catch {
        // ignore
      }
    };

    void load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  if (authStatus === "loading" || !userStatus) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
            <span
              className="absolute inset-0 rounded-full border-2 border-accent"
              style={{ animation: "pulse-ring 2s ease-out infinite" }}
            />
            <span
              className="absolute inset-0 rounded-full border-2 border-accent"
              style={{ animation: "pulse-ring 2s ease-out infinite 0.6s" }}
            />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-surface border border-border">
              <div className="flex items-end gap-1.5">
                <span
                  className="block h-2 w-2 rounded-full bg-accent"
                  style={{ animation: "float-dot 1.4s ease-in-out infinite" }}
                />
                <span
                  className="block h-2 w-2 rounded-full bg-accent"
                  style={{ animation: "float-dot 1.4s ease-in-out infinite 0.2s" }}
                />
                <span
                  className="block h-2 w-2 rounded-full bg-accent"
                  style={{ animation: "float-dot 1.4s ease-in-out infinite 0.4s" }}
                />
              </div>
            </div>
          </div>

          <Card>
            <div className="space-y-3 py-2 text-center">
              <h1 className="text-xl font-semibold tracking-tight">
                Pending Approval
              </h1>
              <p className="text-sm text-muted">
                Your account is being reviewed by an admin. This usually takes a
                few minutes. We will notify you on Telegram once your account is
                approved.
              </p>

              {verificationSubmitted && (
                <p className="text-xs text-muted">
                  Screenshots received. Checking for updates every few seconds…
                </p>
              )}
            </div>
          </Card>

          <Button
            variant="secondary"
            size="sm"
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            Refresh status
          </Button>
        </div>
      </main>
    </>
  );
}