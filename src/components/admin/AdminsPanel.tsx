"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, Trash2, X } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Label } from "@/components/ui/Field";
import { Alert, ErrorBanner } from "@/components/ui/Alert";

type Admin = {
  id: string;
  name: string;
  username: string;
  telegramId: string | null;
  createdAt: string;
};

export function AdminsPanel() {
  const t = useTranslations("admin");

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", telegramId: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("failedToLoadAdmins"));
      setAdmins(data.admins as Admin[]);
      setCurrentUserId(data.currentUserId as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToLoadAdmins"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function createAdmin() {
    setFormError(null);
    if (form.name.trim().length < 2 || form.username.trim().length < 3 || form.password.length < 6) {
      setFormError(t("adminFormError"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          username: form.username.trim(),
          password: form.password,
          telegramId: form.telegramId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("failedToCreateAdmin"));
      setNotice(t("adminCreated", { name: data.admin.name }));
      setAddOpen(false);
      setForm({ name: "", username: "", password: "", telegramId: "" });
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("failedToCreateAdmin"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAdmin() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/admins/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("failedToDeleteAdmin"));
      setNotice(t("adminDeleted"));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToDeleteAdmin"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("navAdmins")}</h1>
          <p className="mt-1 text-sm text-muted">{t("adminsSubtitle")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" />
          {t("addAdmin")}
        </Button>
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

      {loading ? (
        <Card className="p-6 text-sm text-muted">{t("loading")}</Card>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <Card key={admin.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-muted text-sm font-semibold text-muted">
                  {admin.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{admin.name}</p>
                    {admin.id === currentUserId && <Badge>{t("you")}</Badge>}
                  </div>
                  <p className="text-xs text-muted">
                    @{admin.username}
                    {admin.telegramId && ` · ${admin.telegramId}`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:bg-danger-muted"
                disabled={admin.id === currentUserId || admins.length <= 1}
                onClick={() => setDeleteTarget(admin)}
                aria-label={t("delete")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t("addAdmin")}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="admin-name">{t("adminName")}</Label>
            <Input
              id="admin-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="admin-username">{t("adminUsername")}</Label>
            <Input
              id="admin-username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="admin-password">{t("adminPassword")}</Label>
            <Input
              id="admin-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="admin-telegram">{t("adminTelegram")}</Label>
            <Input
              id="admin-telegram"
              value={form.telegramId}
              onChange={(e) => setForm((f) => ({ ...f, telegramId: e.target.value }))}
              dir="ltr"
              placeholder={t("optional")}
            />
          </div>
          <ErrorBanner>{formError}</ErrorBanner>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button onClick={createAdmin} loading={busy}>
              {t("createAdminBtn")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t("delete")}>
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {deleteTarget ? t("deleteAdminConfirm", { name: deleteTarget.name }) : ""}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={deleteAdmin} loading={busy}>
              {t("delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}