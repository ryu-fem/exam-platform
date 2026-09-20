"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Search, ShieldCheck, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { LogOutButton } from "@/components/LogOutButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ErrorBanner } from "@/components/ui/Alert";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  YEAR_LABELS,
  SYSTEM_LABELS,
  TRACK_LABELS,
  ELECTIVE_LABELS,
} from "@/lib/constants";

export type AdminUser = {
  id: string;
  username: string;
  name: string;
  year: string;
  system: string | null;
  track: string | null;
  electiveSubject: string | null;
  status: string;
  telegramId: string | null;
  createdAt: string;
  verification: {
    id: string;
    channelScreenshot: string;
    groupScreenshot: string;
    status: string;
    rejectionReason?: string | null;
  } | null;
};

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
] as const;

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("pending");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminUser | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status: tab });
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = (await res.json()) as { ok: boolean; users?: AdminUser[]; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Failed to load");
      setUsers(json.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [tab, query]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "loading" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role !== "admin") return;
    const controller = new AbortController();
    let cancelled = false;

    const params = new URLSearchParams({ status: tab });
    if (query.trim()) params.set("q", query.trim());

    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          signal: controller.signal,
        });
        if (cancelled) return;
        const json = (await res.json()) as { ok: boolean; users?: AdminUser[]; error?: string };
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error ?? "Failed to load");
        setUsers(json.users ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load users");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [tab, query, session, status]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") return null;

  const act = async (user: AdminUser, action: "approve" | "reject", reason?: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { action, reason } : { action }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Action failed");

      setNotice(
        action === "approve"
          ? `${user.name} has been approved and notified on Telegram.`
          : `${user.name} has been rejected and notified on Telegram.`,
      );
      setRejectTarget(null);
      setRejectReason("");
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const pendingCount =
    tab === "pending"
      ? users.length
      : null;

  return (
    <>
      <Navbar>
        <LogOutButton />
      </Navbar>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <ShieldCheck className="h-6 w-6" />
              Admin Panel
            </h1>
            <p className="mt-1 text-sm text-muted">
              Review membership verifications and manage students.
            </p>
          </div>
        </div>

        {notice && (
          <div className="mb-4 rounded-lg border border-success/20 bg-success-muted px-3.5 py-3 text-sm text-success">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-4">
            <ErrorBanner>{error}</ErrorBanner>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-lg border border-border bg-surface p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer",
                  tab === t.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                {t.label}
                {t.value === "pending" && pendingCount !== null && (
                  <span className="ms-1.5 text-xs opacity-70">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or username"
              className="ps-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading…
          </div>
        ) : users.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-sm text-muted">
              No {tab} students found.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <Card
                key={user.id}
                className="cursor-pointer p-4 transition-colors hover:border-foreground/30"
              >
                <button
                  className="flex w-full items-center justify-between gap-4 text-start"
                  onClick={() => setSelected(user)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{user.name}</span>
                      {user.status === "active" && <Badge variant="success">Active</Badge>}
                      {user.status === "rejected" && <Badge variant="danger">Rejected</Badge>}
                      {!user.verification && user.status === "pending" && (
                        <Badge variant="warning">No screenshots</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">@{user.username}</p>
                  </div>
                  <div className="shrink-0 text-end text-xs text-muted">
                    <p>{YEAR_LABELS[user.year] ?? user.year}</p>
                    <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </button>
              </Card>
            ))}
          </div>
        )}

        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected ? selected.name : ""}
        >
          {selected && (
            <div className="space-y-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Username</dt>
                  <dd className="font-medium">@{selected.username}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Telegram</dt>
                  <dd className="font-medium">
                    {selected.telegramId ? `#${selected.telegramId}` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Grade</dt>
                  <dd className="font-medium">{YEAR_LABELS[selected.year] ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">System</dt>
                  <dd className="font-medium">
                    {SYSTEM_LABELS[selected.system ?? ""] ?? "-"}
                  </dd>
                </div>
                {selected.track && (
                  <div>
                    <dt className="text-xs text-muted">Track</dt>
                    <dd className="font-medium">
                      {TRACK_LABELS[selected.track] ?? "-"}
                    </dd>
                  </div>
                )}
                {selected.electiveSubject && (
                  <div>
                    <dt className="text-xs text-muted">Elective</dt>
                    <dd className="font-medium">
                      {ELECTIVE_LABELS[selected.electiveSubject] ?? "-"}
                    </dd>
                  </div>
                )}
              </dl>

              {selected.status === "rejected" && selected.verification?.rejectionReason && (
                <div className="rounded-lg border border-danger/20 bg-danger-muted px-3.5 py-3 text-sm text-danger">
                  <strong>Rejection reason:</strong> {selected.verification.rejectionReason}
                </div>
              )}

              {selected.verification ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    Screenshots
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs text-muted">Channel proof</p>
                      <div className="overflow-hidden rounded-lg border border-border">
                        <div className="max-h-72 overflow-y-auto bg-surface-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selected.verification.channelScreenshot}
                            alt="Channel screenshot"
                            className="w-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted">Group proof</p>
                      <div className="overflow-hidden rounded-lg border border-border">
                        <div className="max-h-72 overflow-y-auto bg-surface-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selected.verification.groupScreenshot}
                            alt="Group screenshot"
                            className="w-full object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-border bg-surface-muted px-3.5 py-3 text-sm text-muted">
                  No screenshots uploaded yet.
                </p>
              )}

              {selected.status === "pending" && (
                <div className="flex justify-end gap-3 border-t border-border pt-4">
                  <Button
                    variant="danger"
                    onClick={() => setRejectTarget(selected)}
                    disabled={busy}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    loading={busy}
                    onClick={() => void act(selected, "approve")}
                  >
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>

        <Modal
          open={!!rejectTarget}
          onClose={() => {
            setRejectTarget(null);
            setRejectReason("");
          }}
          title={`Reject ${rejectTarget?.name ?? ""}`}
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted">
              The user will be notified on Telegram with this reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. The screenshots do not show membership"
              rows={4}
              className="w-full resize-none rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-muted focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/25"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={busy}
                disabled={rejectReason.trim().length < 2}
                onClick={() => rejectTarget && void act(rejectTarget, "reject", rejectReason.trim())}
              >
                Reject user
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </>
  );
}