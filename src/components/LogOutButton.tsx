"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useRouter } from "@/i18n/navigation";

export function LogOutButton() {
  const router = useRouter();
  const t = useTranslations("common");

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleLogout}>
      <LogOut className="h-3.5 w-3.5" />
      {t("logout")}
    </Button>
  );
}