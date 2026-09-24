"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ZoomIn } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null;
  name: string;
  /** Outer wrapper class to size the thumbnail (defaults to h-10 w-10). */
  className?: string;
  initialClassName?: string;
};

/**
 * Circular avatar thumbnail with a click-to-zoom Lightbox. Lets admins inspect
 * the student's Telegram profile photo at full size before approving.
 */
export function AvatarZoom({ src, name, className, initialClassName }: Props) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);

  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(Boolean(src));
        }}
        disabled={!src}
        aria-label={t("zoomAvatar", { name })}
        title={src ? t("zoomAvatar", { name }) : undefined}
        className={cn(
          "relative block h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface-muted",
          src && "cursor-zoom-in transition-all duration-200 ease-in-out group-hover:ring-2 group-hover:ring-accent/60",
          className,
        )}
      >
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            unoptimized
            sizes="6rem"
            className="object-cover"
          />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-center text-sm font-semibold text-muted",
              initialClassName,
            )}
          >
            {initial}
          </span>
        )}
        {src && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 ease-in-out hover:bg-black/40">
            <ZoomIn className="h-4 w-4 text-white opacity-0 transition-opacity duration-200 ease-in-out hover:opacity-100" />
          </span>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("avatarPreview")}
        className="max-w-lg"
      >
        <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-muted">
          {src && <Image src={src} alt={name} fill unoptimized className="object-contain" />}
        </div>
      </Modal>
    </>
  );
}