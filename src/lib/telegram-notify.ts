import {
  sendTelegramMessage as sendTelegramRaw,
  notifyAdmin,
  escapeHtml,
  getAppUrl,
} from "@/lib/telegram";
import { DEFAULT_LOCALE } from "@/lib/locale";

/**
 * Safe sender: never throws, always logs failures. Returns true when the
 * message was accepted by the Telegram API.
 */
export async function sendTelegramMessage(
  telegramId: string | number | null | undefined,
  message: string,
): Promise<boolean> {
  if (!telegramId) return false;
  try {
    const result = await sendTelegramRaw(telegramId, message);
    if (result?.ok === false) {
      console.warn(
        `[telegram-notify] sendMessage failed for chat ${telegramId}:`,
        result.description ?? "unknown error",
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[telegram-notify] sendMessage threw for chat ${telegramId}:`, err);
    return false;
  }
}

/** Arabic labels used when reporting which profile field changed. */
const FIELD_LABELS: Record<string, string> = {
  name: "الاسم",
  username: "اسم المستخدم",
  password: "كلمة المرور",
  year: "الصف الدراسي",
  system: "النظام",
  section: "القسم",
  track: "المسار",
  electiveSubject: "المادة الاختيارية",
  avatarUrl: "الصورة الشخصية",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/* ── A. Account events ─────────────────────────────────────────── */

export async function notifyAccountApproved(telegramId?: string | null) {
  return sendTelegramMessage(
    telegramId,
    "تم قبول حسابك في منصة الاختبارات ✅ يمكنك الآن الدخول وحل الاختبارات.",
  );
}

export async function notifyAccountRejected(
  telegramId: string | null | undefined,
  reason: string,
) {
  return sendTelegramMessage(
    telegramId,
    `تم رفض حسابك. السبب: ${escapeHtml(reason)}.`,
  );
}

export async function notifyModificationApproved(
  telegramId: string | null | undefined,
  field: string,
  newValue: string,
) {
  const label = fieldLabel(field);
  if (field === "password") {
    return sendTelegramMessage(
      telegramId,
      `تمت الموافقة على تعديل ${label}.`,
    );
  }
  return sendTelegramMessage(
    telegramId,
    `تمت الموافقة على تعديل ${label} إلى ${escapeHtml(newValue)}.`,
  );
}

export async function notifyModificationRejected(
  telegramId: string | null | undefined,
  field: string,
  reason: string,
) {
  return sendTelegramMessage(
    telegramId,
    `تم رفض طلب تعديل ${fieldLabel(field)}. السبب: ${escapeHtml(reason)}.`,
  );
}

/* ── B. Quiz result events ─────────────────────────────────────── */

export async function notifyAttemptApproved(
  telegramId: string | null | undefined,
  quizTitle: string,
  score: number,
  xp: number,
  attemptId: string,
) {
  const url = `${getAppUrl()}/${DEFAULT_LOCALE}/results/${attemptId}`;
  return sendTelegramMessage(
    telegramId,
    `تم اعتماد نتيجة اختبارك: ${escapeHtml(quizTitle)}\nالدرجة: ${score}\nالنقاط: ${xp} XP\nللمزيد: ${url}`,
  );
}

export async function notifyAttemptRejected(
  telegramId: string | null | undefined,
  quizTitle: string,
  reason: string,
) {
  return sendTelegramMessage(
    telegramId,
    `تم رفض محاولتك في اختبار ${escapeHtml(quizTitle)}. السبب: ${escapeHtml(reason)}.`,
  );
}

/* ── C. Admin broadcast & direct message ───────────────────────── */

export async function notifyBroadcast(
  users: { telegramId: string | null }[],
  message: string,
): Promise<number> {
  let sent = 0;
  for (const user of users) {
    if (!user.telegramId) continue;
    const ok = await sendTelegramMessage(user.telegramId, message);
    if (ok) sent += 1;
  }
  return sent;
}

export async function notifyUser(
  telegramId: string | null | undefined,
  message: string,
) {
  return sendTelegramMessage(telegramId, message);
}

/* ── New student registration → admin ──────────────────────────── */

export async function notifyAdminNewStudent(student: {
  name: string;
  year: string;
  track: string | null;
}) {
  const url = `${getAppUrl()}/${DEFAULT_LOCALE}/admin/requests`;
  return notifyAdmin(
    `🧑‍🎓 طالب جديد سجل: ${escapeHtml(student.name)} - ${escapeHtml(student.year)} - ${escapeHtml(student.track ?? "-")}\nراجع الطلب من: ${url}`,
  );
}