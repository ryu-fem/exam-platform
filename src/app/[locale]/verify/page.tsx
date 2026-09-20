"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Info, Loader2, Upload, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/Alert";
import { useRouter } from "@/i18n/navigation";
import { CHANNEL_URL, GROUP_URL } from "@/lib/constants";

interface FileUploadProps {
  label: string;
  description: string;
  onFile: (dataUrl: string) => void;
  preview: string;
}

function FileUpload({ label, description, onFile, preview }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError("");
    if (!file) {
      onFile("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be smaller than 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onFile(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-muted px-4 py-8 transition-colors duration-200 hover:border-foreground/40 cursor-pointer"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={label}
            className="max-h-40 rounded-lg object-contain"
          />
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted transition-colors group-hover:text-foreground" />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted">{description}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

export default function VerifyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [channelShot, setChannelShot] = useState("");
  const [groupShot, setGroupShot] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelShot || !groupShot) {
      setError("Please upload both screenshots.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelScreenshot: channelShot, groupScreenshot: groupShot }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Upload failed. Please try again.");
        setBusy(false);
        return;
      }
      router.push("/pending");
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  const channelUrl = CHANNEL_URL();
  const groupUrl = GROUP_URL();

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold tracking-tight">Verify Membership</h1>
              <p className="text-sm text-muted">
                Join our channels and upload proof to activate your account.
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-surface-muted p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4" />
                  You must be a member of both:
                </p>
                <div className="space-y-2">
                  <a
                    href={channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors hover:border-foreground/40"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted" />
                      Telegram Channel
                    </span>
                    <span className="text-muted">Join →</span>
                  </a>
                  <a
                    href={groupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors hover:border-foreground/40"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted" />
                      Telegram Group
                    </span>
                    <span className="text-muted">Join →</span>
                  </a>
                </div>
              </div>

              <p className="text-sm text-muted">
                After joining, take a <strong>screenshot of the membership page</strong> for
                the channel, and a <strong>screenshot of your profile inside the group</strong>.
              </p>

              {error && <ErrorBanner>{error}</ErrorBanner>}

              <form onSubmit={onSubmit} className="space-y-4">
                <FileUpload
                  label="Channel membership screenshot"
                  description="Shows you are a member of the channel"
                  onFile={setChannelShot}
                  preview={channelShot}
                />
                <FileUpload
                  label="Group membership screenshot"
                  description="Shows your profile inside the group"
                  onFile={setGroupShot}
                  preview={groupShot}
                />

                <Button type="submit" size="lg" className="w-full" loading={busy}>
                  {busy ? "Submitting…" : "Submit for review"}
                </Button>

                <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
                  <Check className="h-3.5 w-3.5" />
                  An admin will review your screenshots shortly.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}