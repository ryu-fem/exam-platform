import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect } from "@/i18n/navigation";
import { authOptions } from "@/lib/auth";

function localizedRedirect(args: { href: string; locale: string }): never {
  return redirect(args);
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await getServerSession(authOptions);
  const locale = (await getLocale()) === "ar" ? "ar" : "en";

  if (!session?.user) localizedRedirect({ href: "/login", locale });
  if (session.user.role !== "admin") localizedRedirect({ href: "/dashboard", locale });

  return (
    <div className="w-full">
      <AdminSidebar />
      <main className="w-full lg:ps-[260px]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}