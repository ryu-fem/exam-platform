import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-auto border-t border-neutral-200 transition-colors duration-200 ease-out dark:border-neutral-800">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6">
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          {t("copyright")} — {t("developedBy")}
        </p>
      </div>
    </footer>
  );
}