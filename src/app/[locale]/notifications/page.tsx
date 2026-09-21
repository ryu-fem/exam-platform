import { Bell, CheckCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { StudentNavbar } from "@/components/StudentNavbar";
import {
  NotificationList,
  type NotificationItem,
} from "@/components/notifications/NotificationList";
import { MarkNotificationsRead } from "@/components/quiz/MarkNotificationsRead";
import { prisma } from "@/lib/prisma";
import { requireStudentUser } from "@/lib/require-student";

export default async function NotificationsPage() {
  const user = await requireStudentUser();
  const t = await getTranslations("notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const items: NotificationItem[] = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <>
      <StudentNavbar user={{ name: user.name, username: user.username }} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted">{t("subtitle")}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
              {t("title")}
            </h1>
          </div>
          {unreadCount > 0 && (
            <MarkNotificationsRead>
              <CheckCheck className="h-4 w-4" />
              {t("markAllRead")}
            </MarkNotificationsRead>
          )}
        </div>

        <NotificationList items={items} />
      </main>
    </>
  );
}