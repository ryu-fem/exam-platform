export type SubjectKey =
  | "arabic"
  | "english"
  | "math"
  | "physics"
  | "chemistry"
  | "biology"
  | "history"
  | "geography"
  | "science"
  | "religious"
  | "programming"
  | "psychology";

export const SUBJECTS: Record<SubjectKey, { en: string; ar: string }> = {
  arabic: { en: "Arabic", ar: "اللغة العربية" },
  english: { en: "English", ar: "اللغة الإنجليزية" },
  math: { en: "Mathematics", ar: "الرياضيات" },
  physics: { en: "Physics", ar: "الفيزياء" },
  chemistry: { en: "Chemistry", ar: "الكيمياء" },
  biology: { en: "Biology", ar: "الأحياء" },
  history: { en: "History", ar: "التاريخ" },
  geography: { en: "Geography", ar: "الجغرافيا" },
  science: { en: "General Science", ar: "العلوم العامة" },
  religious: { en: "Religious Studies", ar: "المواد الشرعية" },
  programming: { en: "Programming & AI", ar: "البرمجة والذكاء الاصطناعي" },
  psychology: { en: "Psychology", ar: "علم النفس" },
};

/** Localize a subject key, falling back to the raw key for unknown subjects. */
export function getSubjectLabel(
  subject: string,
  locale: "en" | "ar",
): string {
  const entry = (SUBJECTS as Record<string, { en: string; ar: string }>)[subject];
  if (!entry) return subject;
  return locale === "ar" ? entry.ar : entry.en;
}