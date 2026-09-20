import { getTranslations } from "next-intl/server";

import { StudentNavbar } from "@/components/StudentNavbar";
import { Card } from "@/components/ui/Card";
import { Trophy } from "lucide-react";
import { requireStudentUser } from "@/lib/require-student";

export default async function LeaderboardPage() {
  const user = await requireStudentUser();
  const t = await getTranslations("leaderboard");

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
              <p className="mt-0.5 text-sm text-muted">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-center gap-2 py-6 text-center">
            <p className="text-sm text-muted">{t("scoringNote")}</p>
          </div>
        </Card>
      </main>
    </>
  );
}