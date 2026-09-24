import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function localizedRedirect(args: { href: string; locale: string }): never {
  return redirect(args);
}

export async function requireStudentUser() {
  const session = await getServerSession(authOptions);
  const locale = (await getLocale()) === "ar" ? "ar" : "en";

  if (!session?.user) localizedRedirect({ href: "/login", locale });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { verification: true },
  });

  if (!user) localizedRedirect({ href: "/login", locale });

  // PENDING students get full read/browse access (guest mode). They are only
  // kept out of the pages that are genuinely not allowed: rejected/inactive
  // accounts must still go through /verify.
  if (user.role !== "admin" && user.status === "rejected") {
    localizedRedirect({ href: "/verify", locale });
  }

  return user;
}