import { getSubjectLabel } from "@/lib/quiz-data";

export type CurriculumLabel = { en: string; ar: string };

export const YEARS: { value: string; label: CurriculumLabel }[] = [
  { value: "1", label: { en: "Year 1 Secondary", ar: "الصف الأول الثانوي" } },
  { value: "2", label: { en: "Year 2 Secondary", ar: "الصف الثاني الثانوي" } },
  { value: "3", label: { en: "Year 3 Secondary", ar: "الصف الثالث الثانوي" } },
];

export const SYSTEMS: Record<string, { value: string; label: CurriculumLabel }[]> = {
  "1": [
    { value: "general", label: { en: "General", ar: "عام" } },
    { value: "azhar", label: { en: "Azhar", ar: "أزهري" } },
  ],
  "2": [
    { value: "general", label: { en: "General", ar: "عام" } },
    { value: "azhar", label: { en: "Azhar", ar: "أزهري" } },
    { value: "baccalaureate", label: { en: "Baccalaureate", ar: "البكالوريا" } },
  ],
  "3": [
    { value: "general", label: { en: "General", ar: "عام" } },
    { value: "azhar", label: { en: "Azhar", ar: "أزهري" } },
  ],
};

/** Sections offered per (year:system) combo. Empty => no section step. */
export const SECTIONS: Record<string, { value: string; label: CurriculumLabel }[]> = {
  "1:azhar": [
    { value: "scientific", label: { en: "Scientific Section", ar: "القسم العلمي" } },
    { value: "literary", label: { en: "Literary Section", ar: "القسم الأدبي" } },
  ],
  "2:general": [
    { value: "scientific", label: { en: "Scientific Section", ar: "القسم العلمي" } },
    { value: "literary", label: { en: "Literary Section", ar: "القسم الأدبي" } },
  ],
  "2:azhar": [
    { value: "scientific", label: { en: "Scientific Section", ar: "القسم العلمي" } },
    { value: "literary", label: { en: "Literary Section", ar: "القسم الأدبي" } },
  ],
  "3:general": [
    { value: "science_biology", label: { en: "Scientific (Biology)", ar: "علمي علوم" } },
    { value: "science_math", label: { en: "Scientific (Math)", ar: "علمي رياضة" } },
    { value: "literary", label: { en: "Literary Section", ar: "القسم الأدبي" } },
  ],
  "3:azhar": [
    { value: "scientific", label: { en: "Scientific Section", ar: "القسم العلمي" } },
    { value: "literary", label: { en: "Literary Section", ar: "القسم الأدبي" } },
  ],
};

export const BACCALAUREATE_TRACKS: { value: string; label: CurriculumLabel }[] = [
  { value: "medicine", label: { en: "Medicine & Life Sciences", ar: "الطب وعلوم الحياة" } },
  { value: "engineering", label: { en: "Engineering & Computer Science", ar: "الهندسة وعلوم الحاسب" } },
  { value: "business", label: { en: "Business", ar: "الأعمال" } },
  { value: "arts", label: { en: "Arts & Humanities", ar: "الآداب والإنسانيات" } },
];

export const BACCALAUREATE_ELECTIVES: Record<
  string,
  { value: string; label: CurriculumLabel }[]
> = {
  medicine: [
    { value: "math", label: { en: "Mathematics", ar: "الرياضيات" } },
    { value: "physics", label: { en: "Physics", ar: "الفيزياء" } },
  ],
  engineering: [
    { value: "chemistry", label: { en: "Chemistry", ar: "الكيمياء" } },
    { value: "programming", label: { en: "Programming & AI", ar: "البرمجة والذكاء الاصطناعي" } },
  ],
  business: [
    { value: "accounting", label: { en: "Accounting", ar: "المحاسبة" } },
    { value: "business_admin", label: { en: "Business Administration", ar: "إدارة الأعمال" } },
  ],
  arts: [
    { value: "psychology", label: { en: "Psychology", ar: "علم النفس" } },
    { value: "second_language", label: { en: "Second Foreign Language", ar: "لغة أجنبية ثانية" } },
  ],
};

/**
 * Curricular subjects per (year:system) or (year:system:section).
 * Keys refer to the subject catalog in `quiz-data.ts`.
 */
export const SUBJECTS_BY_PATH: Record<string, string[]> = {
  "1:general": [
    "arabic",
    "english",
    "math",
    "integrated_sciences",
    "egyptian_history",
    "philosophy",
    "logic",
  ],
  "1:azhar": [
    "quran",
    "fiqh",
    "tafsir",
    "hadith",
    "tawheed",
    "islamic_culture",
    "nahw",
    "sarf",
    "balagha",
    "literature",
    "reading",
    "composition",
  ],
  "1:azhar:scientific": [
    "quran",
    "fiqh",
    "tafsir",
    "hadith",
    "tawheed",
    "islamic_culture",
    "nahw",
    "sarf",
    "balagha",
    "literature",
    "reading",
    "composition",
    "math",
    "integrated_sciences",
    "english",
    "art",
  ],
  "1:azhar:literary": [
    "quran",
    "fiqh",
    "tafsir",
    "hadith",
    "tawheed",
    "islamic_culture",
    "nahw",
    "sarf",
    "balagha",
    "literature",
    "reading",
    "composition",
    "history",
    "philosophy",
    "logic",
    "english",
    "french",
    "integrated_sciences",
    "art",
  ],
  "2:general:scientific": ["arabic", "english", "history", "math", "physics", "chemistry"],
  "2:general:literary": ["arabic", "english", "history", "math", "psychology", "geography"],
  "2:azhar:scientific": [
    "quran",
    "fiqh",
    "tafsir",
    "hadith",
    "tawheed",
    "arabic_branches",
    "english",
    "math",
    "physics",
    "chemistry",
    "biology",
    "art",
  ],
  "2:azhar:literary": [
    "quran",
    "fiqh",
    "tafsir",
    "hadith",
    "tawheed",
    "logic",
    "arabic_branches",
    "english",
    "second_language",
    "psychology",
    "history",
    "geography",
    "art",
  ],
  "2:baccalaureate": ["arabic", "english", "egyptian_history"],
  "3:general:science_biology": ["arabic", "english", "physics", "chemistry", "biology"],
  "3:general:science_math": ["arabic", "english", "math", "chemistry", "physics"],
  "3:general:literary": ["arabic", "english", "history", "geography", "statistics"],
  "3:azhar:scientific": [
    "fiqh",
    "quran",
    "tafsir",
    "hadith",
    "tawheed",
    "inheritance",
    "arabic_branches",
    "physics",
    "chemistry",
    "biology",
    "algebra_geometry",
    "calculus",
    "english",
  ],
  "3:azhar:literary": [
    "fiqh",
    "quran",
    "tafsir",
    "hadith",
    "tawheed",
    "inheritance",
    "arabic_branches",
    "history",
    "geography",
    "statistics",
    "english",
    "french",
  ],
};

export function sectionsFor(
  year: string,
  system: string,
): { value: string; label: CurriculumLabel }[] {
  return SECTIONS[`${year}:${system}`] ?? [];
}

export type CurriculumProfile = {
  year?: string | null;
  system?: string | null;
  section?: string | null;
  track?: string | null;
  electiveSubject?: string | null;
};

/** Subjects a student studies, given their year/system/section/track/elective. */
export function subjectsForProfile(profile: CurriculumProfile): string[] {
  const { year, system, section, track, electiveSubject } = profile;
  if (!year || !system) return [];

  if (system === "baccalaureate") {
    const base = SUBJECTS_BY_PATH["2:baccalaureate"] ?? [];
    if (!track) return base;
    if (electiveSubject) return [...base, electiveSubject];
    const electives = (BACCALAUREATE_ELECTIVES[track] ?? []).map((e) => e.value);
    return [...base, ...electives];
  }

  if (section) {
    const scoped = SUBJECTS_BY_PATH[`${year}:${system}:${section}`];
    if (scoped) return scoped;
  }

  return SUBJECTS_BY_PATH[`${year}:${system}`] ?? [];
}

export function subjectLabel(key: string, locale: "en" | "ar"): string {
  return getSubjectLabel(key, locale);
}