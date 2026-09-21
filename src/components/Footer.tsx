import { getTranslations } from "next-intl/server";

import { CHANNEL_URL, GROUP_URL } from "@/lib/constants";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-auto border-t border-border transition-colors duration-200 ease-out">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
          <a
            href={CHANNEL_URL()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors duration-200 ease-in-out hover:text-foreground"
          >
            {t("channel")}
          </a>
          <a
            href={GROUP_URL()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors duration-200 ease-in-out hover:text-foreground"
          >
            {t("group")}
          </a>
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          {t("copyright")} — {t("developedBy")}
        </p>
      </div>
    </footer>
  );
}