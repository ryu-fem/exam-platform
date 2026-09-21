"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorBanner } from "@/components/ui/Alert";
import {
  BACCALAUREATE_ELECTIVES,
  BACCALAUREATE_TRACKS,
  SECTIONS,
  SYSTEMS,
  YEARS,
  type CurriculumLabel,
} from "@/lib/curriculum";
import { cn } from "@/lib/utils";

type Props = {
  locale: "en" | "ar";
  user: {
    name: string;
    username: string;
    year: string;
    system: string | null;
    section: string | null;
    track: string | null;
    electiveSubject: string | null;
    avatarUrl: string | null;
  };
};

type PendingRequest = {
  id: string;
  field: string;
  status: string;
  createdAt: string;
};

type FieldName =
  | "name"
  | "username"
  | "password"
  | "year"
  | "system"
  | "section"
  | "track"
  | "electiveSubject"
  | "avatarUrl";

const OPTIONS: Record<string, { value: string; label: CurriculumLabel }[]> = {
  year: YEARS,
  system: Object.values(SYSTEMS).flat(),
  section: Object.values(SECTIONS).flat(),
  track: BACCALAUREATE_TRACKS,
  electiveSubject: Object.values(BACCALAUREATE_ELECTIVES).flat(),
};

function localize(label: CurriculumLabel, locale: "en" | "ar") {
  return locale === "ar" ? label.ar : label.en;
}

export function AccountSettingsForm({ locale, user }: Props) {
  const t = useTranslations("settings");

  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/change-request", {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok: boolean;
        requests?: PendingRequest[];
      };
      if (json.ok) setPending(json.requests ?? []);
    } catch {
      // Non-fatal; pending badges just won't show.
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const pendingFields = useMemo(
    () => new Set(pending.filter((r) => r.status === "pending").map((r) => r.field)),
    [pending],
  );

  const fieldLabel = (field: string): string => {
    switch (field) {
      case "name":
        return t("name");
      case "username":
        return t("username");
      case "password":
        return t("newPassword");
      case "year":
        return t("grade");
      case "system":
        return t("system");
      case "section":
        return t("section");
      case "track":
        return t("track");
      case "electiveSubject":
        return t("elective");
      case "avatarUrl":
        return t("avatar");
      default:
        return field;
    }
  };

  const currentValue = (field: FieldName): string => {
    switch (field) {
      case "name":
        return user.name;
      case "username":
        return user.username;
      case "password":
        return "";
      case "year":
        return user.year;
      case "system":
        return user.system ?? "";
      case "section":
        return user.section ?? "";
      case "track":
        return user.track ?? "";
      case "electiveSubject":
        return user.electiveSubject ?? "";
      case "avatarUrl":
        return user.avatarUrl ?? "";
      default:
        return "";
    }
  };

  const submit = async (
    field: FieldName,
    newValue: string,
    note: string,
  ): Promise<void> => {
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/settings/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, newValue, note: note || undefined }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        const code = json.error ?? "errorGeneric";
        if (code === "duplicate" || code === "dupRequest") setError(t("dupRequest"));
        else if (code === "usernameTaken") setError(t("usernameTaken"));
        else if (code === "noChange") setError(t("noChange"));
        else if (code === "invalidUsername") setError(t("invalidUsername"));
        else if (code === "invalidName") setError(t("invalidName"));
        else if (code === "invalidPassword") setError(t("invalidPassword"));
        else if (code === "invalidAvatar") setError(t("invalidAvatar"));
        else if (code === "invalidFieldValue") setError(t("invalidFieldValue"));
        else setError(t("errorGeneric"));
        return;
      }
      setNotice(t("submittedNotice"));
      await loadPending();
    } catch {
      setError(t("errorGeneric"));
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-lg border border-success/20 bg-success-muted px-3.5 py-3 text-sm text-success">
          {notice}
        </div>
      )}
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <AvatarEditor
        user={user}
        locale={locale}
        pending={pendingFields.has("avatarUrl")}
        label={fieldLabel("avatarUrl")}
        currentLabel={t("currentValue")}
        onSave={(value) => void submit("avatarUrl", value, "")}
      />

      <TextEditor
        field="name"
        label={fieldLabel("name")}
        current={currentValue("name")}
        pending={pendingFields.has("name")}
        currentLabel={t("currentValue")}
        submitLabel={t("requestChange")}
        notePlaceholder={t("changeNotePlaceholder")}
        onSave={(value, note) => void submit("name", value, note)}
      />

      <TextEditor
        field="username"
        label={fieldLabel("username")}
        current={currentValue("username")}
        pending={pendingFields.has("username")}
        currentLabel={t("currentValue")}
        submitLabel={t("requestChange")}
        notePlaceholder={t("changeNotePlaceholder")}
        onSave={(value, note) => void submit("username", value, note)}
      />

      <TextEditor
        field="password"
        label={fieldLabel("password")}
        type="password"
        current={currentValue("password")}
        pending={pendingFields.has("password")}
        currentLabel={t("currentValue")}
        submitLabel={t("requestChange")}
        notePlaceholder={t("changeNotePlaceholder")}
        onSave={(value, note) => void submit("password", value, note)}
      />

      {(Object.keys(OPTIONS) as FieldName[]).map((field) => (
        <SelectEditor
          key={field}
          field={field}
          label={fieldLabel(field)}
          current={currentValue(field)}
          pending={pendingFields.has(field)}
          currentLabel={t("currentValue")}
          submitLabel={t("requestChange")}
          notePlaceholder={t("changeNotePlaceholder")}
          locale={locale}
          onSave={(value, note) => void submit(field, value, note)}
        />
      ))}

      {loadingPending ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" />
      ) : null}
    </div>
  );
}

function PendingBadge({ pending }: { pending: boolean }) {
  const t = useTranslations("settings");
  if (!pending) return null;
  return (
    <Badge variant="warning">
      <ShieldCheck className="h-3 w-3" />
      {t("pendingBadge")}
    </Badge>
  );
}

function AvatarEditor({
  user,
  locale,
  pending,
  label,
  currentLabel,
  onSave,
}: {
  user: Props["user"];
  locale: "en" | "ar";
  pending: boolean;
  label: string;
  currentLabel: string;
  onSave: (value: string) => void;
}) {
  const t = useTranslations("settings");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (f: File | null) => {
    setError("");
    setFile(f ?? null);
    if (!f) {
      setPreview(null);
      return;
    }
    if (!f.type.startsWith("image/") || f.size > 400_000) {
      setError(t("invalidAvatar"));
      setFile(null);
      setPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!preview) return;
    setBusy(true);
    onSave(preview);
    setBusy(false);
  };

  return (
    <div className="rounded-2xl card-flat p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {label}
        </h3>
        <PendingBadge pending={pending} />
      </div>
      <p className="mt-1 text-xs text-muted">{currentLabel}</p>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-surface-muted">
          {preview ?? user.avatarUrl ? (
            <Image
              src={(preview ?? user.avatarUrl) as string}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block w-full max-w-[220px] text-xs text-muted file:me-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground"
          />
          <Button size="sm" disabled={!preview || busy} onClick={() => void submit()}>
            {t("requestChange")}
          </Button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

function TextEditor({
  label,
  type = "text",
  current,
  pending,
  currentLabel,
  submitLabel,
  notePlaceholder,
  onSave,
}: {
  field: string;
  label: string;
  type?: "text" | "password";
  current: string;
  pending: boolean;
  currentLabel: string;
  submitLabel: string;
  notePlaceholder: string;
  onSave: (value: string, note: string) => void;
}) {
  const t = useTranslations("settings");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    if (!value.trim()) {
      setError(t("enterValue"));
      return;
    }
    setError("");
    setBusy(true);
    onSave(value.trim(), note.trim());
    setBusy(false);
    setValue("");
    setNote("");
  };

  return (
    <div className="rounded-2xl card-flat p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {label}
        </h3>
        <PendingBadge pending={pending} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {currentLabel}:{" "}
        <span className="font-medium text-foreground">
          {current || "—"}
        </span>
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={label}
          autoComplete="off"
          className="sm:max-w-[260px]"
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={notePlaceholder}
          className="sm:max-w-[260px]"
        />
        <Button size="sm" disabled={busy} onClick={submit}>
          {submitLabel}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

function SelectEditor({
  field,
  label,
  current,
  pending,
  currentLabel,
  submitLabel,
  notePlaceholder,
  locale,
  onSave,
}: {
  field: FieldName;
  label: string;
  current: string;
  pending: boolean;
  currentLabel: string;
  submitLabel: string;
  notePlaceholder: string;
  locale: "en" | "ar";
  onSave: (value: string, note: string) => void;
}) {
  const t = useTranslations("settings");
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const options = (OPTIONS[field] ?? [])
    .filter((o) => o.value !== current)
    .map((o) => ({ value: o.value, label: localize(o.label, locale) }));

  const submit = () => {
    if (!selected) {
      setError(t("enterValue"));
      return;
    }
    setError("");
    setBusy(true);
    onSave(selected, note.trim());
    setBusy(false);
    setSelected("");
    setNote("");
  };

  return (
    <div className="rounded-2xl card-flat p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {label}
        </h3>
        <PendingBadge pending={pending} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {currentLabel}:{" "}
        <span className="font-medium text-foreground">
          {current
            ? localize(
                (OPTIONS[field] ?? []).find((o) => o.value === current)
                  ?.label ?? ({ en: "", ar: "" } as CurriculumLabel),
                locale,
              ) || current
            : "—"}
        </span>
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className={cn(
            "h-10 rounded-xl border border-border bg-surface px-3 text-sm focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/25 transition-all duration-200 ease-in-out sm:max-w-[260px]",
            !selected && "text-muted",
          )}
        >
          <option value="">{t("selectPlaceholder")}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={notePlaceholder}
          className="sm:max-w-[260px]"
        />
        <Button size="sm" disabled={busy} onClick={submit}>
          {submitLabel}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}