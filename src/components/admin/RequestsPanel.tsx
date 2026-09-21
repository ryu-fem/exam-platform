"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Field";
import { Alert, ErrorBanner } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";
import { YEARS } from "@/lib/curriculum";

type PendingStudent = {
  id: string;
  name: string;
  username: string;
  telegramId: string | null;
  year: string;
  avatarUrl: string | null;
  verification: {
    channelScreenshot: string;
    groupScreenshot: string;
    status: string;
  } | null;
};

type ChangeRequest = {
  id: string;
  field: string;
  currentValue: string | null;
  newValue: string;
  note: string | null;
  createdAt: string;
  user: { id: string; name: string; username: string; year: string; system: string | null };
};

const FIELD_LABELS: Record<string, string> = {
  name: "الاسم",
  username: "اسم المستخدم",
  password: "كلمة المرور",
  year: "الصف الدراسي",
  system: "النظام",
  section: "القسم",
  track: "المسار",
  electiveSubject: "المادة الاختيارية",
  avatarUrl: "الصورة الشخصية",
};

function yearLabel(value: string, locale: string) {
  const y = YEARS.find((item) => item.value === value);
  return y ? (locale === "ar" ? y.label.ar : y.label.en) : value;
}

export function RequestsPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [tab, setTab] = useState<"accounts" | "changes">("accounts");

  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [rejectingRequest, setRejectingRequest] = useState<ChangeRequest | null>(null);
  const [requestReason, setRequestReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, reqRes] = await Promise.all([
        fetch("/api/admin/users?status=pending", { cache: "no-store" }),
        fetch("/api/admin/change-requests", { cache: "no-store" }),
      ]);
      const usersData = await usersRes.json();
      const reqData = await reqRes.json();
      if (!usersRes.ok || !usersData.ok) throw new Error(usersData.error || t("failedToLoadUsers"));
      if (!reqRes.ok || !reqData.ok) throw new Error(reqData.error || t("failedToLoadRequests"));
      setStudents(usersData.users as PendingStudent[]);
      setRequests(reqData.requests as ChangeRequest[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function reviewStudent(action: "approve" | "reject") {
    if (!selectedStudent) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedStudent.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("actionFailed"));
      setNotice(
        action === "approve"
          ? t("approvedNotice", { name: selectedStudent.name })
          : t("rejectedNotice", { name: selectedStudent.name }),
      );
      setSelectedStudent(null);
      setRejecting(false);
      setReason("");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function reviewRequest(action: "approve" | "reject") {
    const target = rejectingRequest;
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/change-requests/${target.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: requestReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("actionFailed"));
      setNotice(
        action === "approve"
          ? t("requestApprovedNotice", { name: target.user.name })
          : t("requestRejectedNotice", { name: target.user.name }),
      );
      setRejectingRequest(null);
      setRequestReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("navRequests")}</h1>
        <p className="mt-1 text-sm text-muted">{t("requestsSubtitle")}</p>
      </header>

      {notice && (
        <Alert variant="success" className="flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}
      <ErrorBanner>{error}</ErrorBanner>

      <div className="flex gap-1 border-b border-border">
        {(["accounts", "changes"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out cursor-pointer",
              tab === key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {key === "accounts" ? t("tabAccounts") : t("tabChanges")}
            <span className="ms-2 text-xs text-muted">
              {key === "accounts" ? students.length : requests.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted">{t("loading")}</Card>
      ) : tab === "accounts" ? (
        students.length === 0 ? (
          <Card className="p-6 text-sm text-muted">{t("noPendingAccounts")}</Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {students.map((student) => (
              <Card key={student.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface-muted">
                    {student.avatarUrl ? (
                      <Image src={student.avatarUrl} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted">
                        {student.name.slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{student.name}</p>
                    <p className="truncate text-xs text-muted">
                      @{student.username} · {yearLabel(student.year, locale)}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setSelectedStudent(student)}>
                  {t("review")}
                </Button>
              </Card>
            ))}
          </div>
        )
      ) : requests.length === 0 ? (
        <Card className="p-6 text-sm text-muted">{t("noPendingChanges")}</Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{req.user.name}</p>
                    <Badge>{FIELD_LABELS[req.field] ?? req.field}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">@{req.user.username}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-md bg-surface-muted px-2 py-1 text-xs text-muted line-through">
                      {req.field === "password" ? "••••••••" : (req.currentValue || "—")}
                    </span>
                    <span className="text-muted">→</span>
                    <span className="rounded-md border border-border px-2 py-1 text-xs">
                      {req.field === "password" ? "••••••••" : req.newValue}
                    </span>
                  </div>
                  {req.note && <p className="mt-2 text-xs text-muted">{t("studentNote")} {req.note}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => reviewRequest("approve")} disabled={busy}>
                    {t("approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setRejectingRequest(req);
                      setRequestReason("");
                    }}
                    disabled={busy}
                  >
                    {t("reject")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent?.name}
      >
        {selectedStudent && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Screenshot label={t("channelProof")} src={selectedStudent.verification?.channelScreenshot} />
              <Screenshot label={t("groupProof")} src={selectedStudent.verification?.groupScreenshot} />
            </div>
            <ErrorBanner>{actionError}</ErrorBanner>
            {rejecting ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">{t("rejectNotice")}</p>
                <Label htmlFor="account-reason">{t("rejectionReason")}</Label>
                <Input
                  id="account-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("rejectPlaceholder")}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setRejecting(false)} disabled={busy}>
                    {t("cancel")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => reviewStudent("reject")}
                    loading={busy}
                    disabled={reason.trim().length < 2}
                  >
                    {t("rejectUser")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button variant="danger" onClick={() => setRejecting(true)} disabled={busy}>
                  {t("reject")}
                </Button>
                <Button onClick={() => reviewStudent("approve")} loading={busy}>
                  {t("approve")}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title={t("rejectRequestTitle")}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted">{t("rejectNotice")}</p>
          <Label htmlFor="request-reason">{t("rejectionReason")}</Label>
          <Input
            id="request-reason"
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
            placeholder={t("rejectPlaceholder")}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejectingRequest(null)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => reviewRequest("reject")}
              loading={busy}
              disabled={requestReason.trim().length < 2}
            >
              {t("reject")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Screenshot({ label, src }: { label: string; src?: string }) {
  const t = useTranslations("admin");
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{label}</p>
      {src ? (
        <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-surface-muted">
          <Image src={src} alt={label} fill unoptimized className="object-contain" />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
          {t("noScreenshots")}
        </div>
      )}
    </div>
  );
}