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
  | "integrated_sciences"
  | "egyptian_history"
  | "philosophy"
  | "logic"
  | "statistics"
  | "psychology"
  | "sociology"
  | "french"
  | "second_language"
  | "art"
  | "quran"
  | "fiqh"
  | "tafsir"
  | "hadith"
  | "tawheed"
  | "inheritance"
  | "islamic_culture"
  | "arabic_branches"
  | "nahw"
  | "sarf"
  | "balagha"
  | "literature"
  | "reading"
  | "composition"
  | "algebra_geometry"
  | "calculus"
  | "religious"
  | "programming"
  | "accounting"
  | "business_admin";

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
  integrated_sciences: {
    en: "Integrated Sciences",
    ar: "العلوم المتكاملة",
  },
  egyptian_history: { en: "Egyptian History", ar: "تاريخ مصر" },
  philosophy: { en: "Philosophy", ar: "الفلسفة" },
  logic: { en: "Logic", ar: "المنطق" },
  statistics: { en: "Statistics", ar: "الإحصاء" },
  psychology: { en: "Psychology & Sociology", ar: "علم النفس والاجتماع" },
  sociology: { en: "Sociology", ar: "علم الاجتماع" },
  french: { en: "French", ar: "اللغة الفرنسية" },
  second_language: {
    en: "Second Foreign Language",
    ar: "لغة أجنبية ثانية",
  },
  art: { en: "Art", ar: "التربية الفنية" },
  quran: { en: "Quran", ar: "القرآن الكريم" },
  fiqh: { en: "Fiqh", ar: "الفقه" },
  tafsir: { en: "Tafsir", ar: "التفسير" },
  hadith: { en: "Hadith", ar: "الحديث" },
  tawheed: { en: "Tawheed", ar: "التوحيد" },
  inheritance: { en: "Inheritance (Faraid)", ar: "المواريث" },
  islamic_culture: { en: "Islamic Culture", ar: "الثقافة الإسلامية" },
  arabic_branches: { en: "Arabic Branches", ar: "فروع اللغة العربية" },
  nahw: { en: "Nahw (Grammar)", ar: "النحو" },
  sarf: { en: "Sarf (Morphology)", ar: "الصرف" },
  balagha: { en: "Balagha (Rhetoric)", ar: "البلاغة" },
  literature: { en: "Literature", ar: "الأدب" },
  reading: { en: "Reading", ar: "القراءة" },
  composition: { en: "Composition", ar: "الإنشاء" },
  algebra_geometry: { en: "Math (Algebra & Geometry)", ar: "الجبر والهندسة" },
  calculus: { en: "Math (Calculus)", ar: "التفاضل والتكامل" },
  religious: { en: "Religious Studies", ar: "المواد الشرعية" },
  programming: { en: "Programming & AI", ar: "البرمجة والذكاء الاصطناعي" },
  accounting: { en: "Accounting", ar: "المحاسبة" },
  business_admin: { en: "Business Administration", ar: "إدارة الأعمال" },
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