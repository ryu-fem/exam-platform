import { getLocale, getTranslations } from "next-intl/server";

import { StudentNavbar } from "@/components/StudentNavbar";
import { Card } from "@/components/ui/Card";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { requireStudentUser } from "@/lib/require-student";

export default async function SettingsPage() {
  const user = await requireStudentUser();
  const t = await getTranslations("settings");
  const rawLocale = await getLocale();
  const locale = rawLocale === "ar" ? "ar" : "en";

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>

        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("profileSection")}
          </h2>
          <p className="mb-4 text-xs text-muted">{t("workflowHint")}</p>
          <AccountSettingsForm
            locale={locale}
            user={{
              name: user.name,
              username: user.username,
              year: user.year,
              system: user.system,
              section: user.section,
              track: user.track,
              electiveSubject: user.electiveSubject,
              avatarUrl: user.avatarUrl,
            }}
          />
        </Card>
      </main>
    </>
  );
}