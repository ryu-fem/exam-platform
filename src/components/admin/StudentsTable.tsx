"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Field";
import { Alert, ErrorBanner } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";
import {
  YEARS,
  SYSTEMS,
  SECTIONS,
  BACCALAUREATE_TRACKS,
} from "@/lib/curriculum";
import { getSubjectLabel } from "@/lib/quiz-data";
import { AvatarZoom } from "@/components/admin/AvatarZoom";

type Verification = {
  channelScreenshot: string;
  groupScreenshot: string;
  status: string;
  rejectionReason: string | null;
};

type Student = {
  id: string;
  name: string;
  username: string;
  telegramId: string | null;
  year: string;
  system: string | null;
  section: string | null;
  track: string | null;
  electiveSubject: string | null;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
  verification: Verification | null;
};

const PAGE_SIZE = 20;

function yearLabel(value: string, locale: string) {
  const y = YEARS.find((item) => item.value === value);
  return y ? (locale === "ar" ? y.label.ar : y.label.en) : value;
}
function systemLabel(value: string | null, locale: string) {
  if (!value) return "—";
  for (const list of Object.values(SYSTEMS)) {
    const found = list.find((item) => item.value === value);
    if (found) return locale === "ar" ? found.label.ar : found.label.en;
  }
  return value;
}
function sectionLabel(value: string | null, locale: string) {
  if (!value) return "—";
  for (const list of Object.values(SECTIONS)) {
    const found = list.find((item) => item.value === value);
    if (found) return locale === "ar" ? found.label.ar : found.label.en;
  }
  return value;
}
function trackLabel(value: string | null, locale: string) {
  if (!value) return "—";
  const found = BACCALAUREATE_TRACKS.find((item) => item.value === value);
  return found ? (locale === "ar" ? found.label.ar : found.label.en) : value;
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
  }).format(date);
}

function statusVariant(status: string): "success" | "danger" | "warning" {
  if (status === "active") return "success";
  if (status === "rejected") return "danger";
  return "warning";
}

function statusKey(status: string): "status_pending" | "status_active" | "status_rejected" {
  if (status === "active") return "status_active";
  if (status === "rejected") return "status_rejected";
  return "status_pending";
}

export function StudentsTable() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [year, setYear] = useState("");
  const [system, setSystem] = useState("");
  const [track, setTrack] = useState("");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Student | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      if (year) params.set("year", year);
      if (track) params.set("track", track);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("failedToLoadUsers"));
      let users = data.users as Student[];
      if (system) users = users.filter((u) => u.system === system);
      setStudents(users);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToLoadUsers"));
    } finally {
      setLoading(false);
    }
  }, [q, status, year, system, track, t]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const systemOptions = useMemo(() => {
    const values = year
      ? (SYSTEMS[year] ?? []).map((s) => s.value)
      : [...new Set(Object.values(SYSTEMS).flat().map((s) => s.value))];
    return values.map((value) => ({ value, label: systemLabel(value, locale) }));
  }, [year, locale]);

  const pageCount = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pageItems = students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function review(action: "approve" | "reject") {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("actionFailed"));
      setNotice(
        action === "approve"
          ? t("approvedNotice", { name: selected.name })
          : t("rejectedNotice", { name: selected.name }),
      );
      setSelected(null);
      setRejecting(false);
      setReason("");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("navStudents")}</h1>
        <p className="mt-1 text-sm text-muted">{t("studentsSubtitle")}</p>
      </header>

      {notice && (
        <Alert variant="success" className="flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-current opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}
      <ErrorBanner>{error}</ErrorBanner>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="ps-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "all", label: t("filterAll") },
              { value: "pending", label: t("tabPending") },
              { value: "active", label: t("tabActive") },
              { value: "rejected", label: t("tabRejected") },
            ]}
          />
          <Select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setSystem("");
            }}
            options={[
              { value: "", label: t("filterAllYears") },
              ...YEARS.map((y) => ({ value: y.value, label: locale === "ar" ? y.label.ar : y.label.en })),
            ]}
          />
          <Select
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            options={[{ value: "", label: t("allSystems") }, ...systemOptions]}
          />
          <Select
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            options={[
              { value: "", label: t("filterAllTracks") },
              ...BACCALAUREATE_TRACKS.map((tr) => ({
                value: tr.value,
                label: locale === "ar" ? tr.label.ar : tr.label.en,
              })),
            ]}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted">{t("loading")}</p>
        ) : students.length === 0 ? (
          <p className="p-6 text-sm text-muted">{t("noStudentsFiltered")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs text-muted">
                  <th className="px-4 py-3 text-start font-medium">{t("colStudent")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("colYear")}</th>
                  <th className="hidden px-4 py-3 text-start font-medium md:table-cell">{t("colTrack")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => {
                      setSelected(student);
                      setRejecting(false);
                      setReason("");
                      setActionError(null);
                    }}
                    className="cursor-pointer border-b border-border last:border-0 transition-colors duration-200 ease-in-out hover:bg-surface-muted"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AvatarZoom
                          src={student.avatarUrl}
                          name={student.name}
                          className="h-9 w-9"
                          initialClassName="text-xs"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{student.name}</p>
                          <p className="truncate text-xs text-muted">@{student.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{yearLabel(student.year, locale)}</td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">
                      {trackLabel(student.track, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(student.status)}>
                        {t(statusKey(student.status))}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted">
              {t("pageOf", { page, total: pageCount })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <AvatarZoom
                src={selected.avatarUrl}
                name={selected.name}
                className="h-16 w-16"
                initialClassName="text-lg"
              />
              <div>
                <p className="font-semibold">{selected.name}</p>
                <p className="text-sm text-muted">@{selected.username}</p>
                {selected.telegramId && (
                  <p className="text-xs text-muted">{t("dtTelegram")}: {selected.telegramId}</p>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Detail label={t("dtYear")} value={yearLabel(selected.year, locale)} />
              <Detail label={t("dtSystem")} value={systemLabel(selected.system, locale)} />
              <Detail label={t("dtSection")} value={sectionLabel(selected.section, locale)} />
              <Detail label={t("dtTrack")} value={trackLabel(selected.track, locale)} />
              <Detail
                label={t("dtElective")}
                value={selected.electiveSubject ? getSubjectLabel(selected.electiveSubject, locale as "en" | "ar") : "—"}
              />
              <Detail
                label={t("dtStatus")}
                value={<Badge variant={statusVariant(selected.status)}>{t(statusKey(selected.status))}</Badge>}
              />
              <Detail
                label={t("dtRegisteredAt")}
                value={formatDate(selected.createdAt, locale)}
              />
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <Screenshot label={t("channelProof")} src={selected.verification?.channelScreenshot} />
              <Screenshot label={t("groupProof")} src={selected.verification?.groupScreenshot} />
            </div>

            {selected.verification?.rejectionReason && (
              <p className="text-xs text-danger">
                {t("rejectionReason")} {selected.verification.rejectionReason}
              </p>
            )}

            <ErrorBanner>{actionError}</ErrorBanner>

            {rejecting ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">{t("rejectNotice")}</p>
                <Label htmlFor="reason">{t("rejectionReason")}</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("rejectPlaceholder")}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setRejecting(false)} disabled={busy}>
                    {t("cancel")}
                  </Button>
                  <Button variant="danger" onClick={() => review("reject")} loading={busy} disabled={reason.trim().length < 2}>
                    {t("rejectUser")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                {selected.status !== "rejected" && (
                  <Button variant="danger" onClick={() => setRejecting(true)} disabled={busy}>
                    {t("reject")}
                  </Button>
                )}
                {selected.status !== "active" && (
                  <Button onClick={() => review("approve")} loading={busy}>
                    {t("approve")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Screenshot({ label, src }: { label: string; src?: string }) {
  const t = useTranslations("admin");
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{label}</p>
      {src ? (
        <div className={cn("relative aspect-video overflow-hidden rounded-lg border border-border bg-surface-muted")}>
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