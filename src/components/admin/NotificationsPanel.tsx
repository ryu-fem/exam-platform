"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Send, Users } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Field";
import { Alert, ErrorBanner } from "@/components/ui/Alert";
import { YEARS, SYSTEMS, BACCALAUREATE_TRACKS } from "@/lib/curriculum";

type Broadcast = { message: string; createdAt: string; recipients: number };

export function NotificationsPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const isAr = locale === "ar";

  const [message, setMessage] = useState("");
  const [year, setYear] = useState("");
  const [system, setSystem] = useState("");
  const [track, setTrack] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.ok) setBroadcasts(data.broadcasts as Broadcast[]);
    } catch {
      // ignore — list is secondary
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function send() {
    setError(null);
    setNotice(null);
    if (!message.trim()) {
      setError(t("messageRequired"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "broadcast",
          message: message.trim(),
          filter: {
            year: year || undefined,
            system: system || undefined,
            track: track || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("sendFailed"));
      setNotice(t("broadcastSent", { count: data.targeted, bot: data.botSent }));
      setMessage("");
      setYear("");
      setSystem("");
      setTrack("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sendFailed"));
    } finally {
      setBusy(false);
    }
  }

  const systemOptions = (year ? (SYSTEMS[year] ?? []) : []).map((s) => ({
    value: s.value,
    label: isAr ? s.label.ar : s.label.en,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{t("navNotifications")}</h1>
        <p className="mt-1 text-sm text-muted">{t("notificationsSubtitle")}</p>
      </header>

      {notice && <Alert variant="success">{notice}</Alert>}
      <ErrorBanner>{error}</ErrorBanner>

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted" />
          <h2 className="text-base font-semibold">{t("newBroadcast")}</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>{t("filterYear")}</Label>
            <Select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setSystem("");
              }}
              options={[
                { value: "", label: t("allStudents") },
                ...YEARS.map((y) => ({ value: y.value, label: isAr ? y.label.ar : y.label.en })),
              ]}
            />
          </div>
          <div>
            <Label>{t("filterSystem")}</Label>
            <Select
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              disabled={!year}
              options={[{ value: "", label: t("allSystems") }, ...systemOptions]}
            />
          </div>
          <div>
            <Label>{t("filterTrack")}</Label>
            <Select
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              options={[
                { value: "", label: t("allTracks") },
                ...BACCALAUREATE_TRACKS.map((tr) => ({
                  value: tr.value,
                  label: isAr ? tr.label.ar : tr.label.en,
                })),
              ]}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="broadcast-message">{t("messageLabel")}</Label>
          <textarea
            id="broadcast-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder={t("messagePlaceholder")}
            className="w-full rounded-lg border border-border bg-surface p-3 text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-foreground/25"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={send} loading={busy} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
            {t("sendBroadcast")}
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold">{t("previousBroadcasts")}</h2>
        {loading ? (
          <Card className="p-6 text-sm text-muted">{t("loading")}</Card>
        ) : broadcasts.length === 0 ? (
          <Card className="p-6 text-sm text-muted">{t("noBroadcasts")}</Card>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((broadcast, index) => (
              <Card key={index} className="p-4">
                <p className="whitespace-pre-wrap text-sm">{broadcast.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(broadcast.createdAt).toLocaleString(locale)} ·{" "}
                  {t("recipientCount", { count: broadcast.recipients })}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}