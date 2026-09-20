export const YEARS = [
  { value: "1", label: "Year 1 Secondary" },
  { value: "2", label: "Year 2 Secondary" },
  { value: "3", label: "Year 3 Secondary" },
] as const;

export const SYSTEMS: Record<string, { value: string; label: string }[]> = {
  "1": [
    { value: "general", label: "General" },
    { value: "azhar", label: "Azhar" },
  ],
  "2": [
    { value: "general", label: "General" },
    { value: "azhar", label: "Azhar" },
    { value: "baccalaureate", label: "Baccalaureate" },
  ],
  "3": [
    { value: "general", label: "General" },
    { value: "azhar", label: "Azhar" },
  ],
};

export const TRACKS: Record<string, { value: string; label: string }[]> = {
  medicine: [
    { value: "medicine", label: "Medicine & Life Sciences" },
  ],
  engineering: [
    { value: "engineering", label: "Engineering & Computer Science" },
  ],
  business: [
    { value: "business", label: "Business" },
  ],
  arts: [
    { value: "arts", label: "Arts & Humanities" },
  ],
};

export const ELECTIVES: Record<string, { val: string; label: string }[]> = {
  medicine: [
    { val: "math", label: "Math" },
    { val: "physics", label: "Physics" },
  ],
  engineering: [
    { val: "chemistry", label: "Chemistry" },
    { val: "programming", label: "Programming & AI" },
  ],
  business: [
    { val: "accounting", label: "Accounting" },
    { val: "business_admin", label: "Business Administration" },
  ],
  arts: [
    { val: "psychology", label: "Psychology" },
    { val: "language", label: "Second Foreign Language" },
  ],
};

export const YEAR_LABELS: Record<string, string> = {
  "1": "Year 1 Secondary",
  "2": "Year 2 Secondary",
  "3": "Year 3 Secondary",
};

export const SYSTEM_LABELS: Record<string, string> = {
  general: "General",
  azhar: "Azhar",
  baccalaureate: "Baccalaureate",
};

export const TRACK_LABELS: Record<string, string> = {
  medicine: "Medicine & Life Sciences",
  engineering: "Engineering & Computer Science",
  business: "Business",
  arts: "Arts & Humanities",
};

export const ELECTIVE_LABELS: Record<string, string> = {
  math: "Math",
  physics: "Physics",
  chemistry: "Chemistry",
  programming: "Programming & AI",
  accounting: "Accounting",
  business_admin: "Business Administration",
  psychology: "Psychology",
  language: "Second Foreign Language",
};

export function trackForElective(elective: string): string {
  for (const [track, electives] of Object.entries(ELECTIVES)) {
    if (electives.some((e) => e.val === elective)) return track;
  }
  return "";
}

export const CHANNEL_URL = () =>
  process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL ??
  process.env.TELEGRAM_CHANNEL_URL ??
  "https://t.me/your_channel";
export const GROUP_URL = () =>
  process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL ??
  process.env.TELEGRAM_GROUP_URL ??
  "https://t.me/your_group";