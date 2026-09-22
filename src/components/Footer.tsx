import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-auto border-t border-border transition-colors duration-200 ease-out">
      <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-3">
        <p className="text-center text-xs text-muted">
          {t("copyright")} — {t("developedBy")}
        </p>
      </div>
    </footer>
  );
}