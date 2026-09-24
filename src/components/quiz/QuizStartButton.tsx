"use client";

import { useTranslations } from "next-intl";
import { ScanLine } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/toast";

type Props = {
  subject: string;
  quizId: string;
  /** True when the current user is in PENDING (read-only) guest mode. */
  isPending: boolean;
};

/**
 * Client-aware "start quiz" action. PENDING accounts get a disabled button
 * that explains the read-only restriction via toast instead of navigating.
 */
export function QuizStartButton({ subject, quizId, isPending }: Props) {
  const t = useTranslations("quizzes");
  const tc = useTranslations("common");

  if (isPending) {
    return (
      <button
        type="button"
        onClick={() => showToast(tc("pendingReadOnlyToast"))}
        className={cn(
          buttonVariants({ variant: "primary", size: "lg" }),
          "mt-6 w-full cursor-not-allowed opacity-80",
        )}
      >
        <ScanLine className="h-4 w-4" />
        {t("startQuiz")}
      </button>
    );
  }

  return (
    <Link
      href={`/quizzes/${subject}/${quizId}/take`}
      className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-6 w-full")}
    >
      <ScanLine className="h-4 w-4" />
      {t("startQuiz")}
    </Link>
  );
}