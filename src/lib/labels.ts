import {
  BACCALAUREATE_ELECTIVES,
  BACCALAUREATE_TRACKS,
  SECTIONS,
  SYSTEMS,
  YEARS,
  type CurriculumLabel,
} from "@/lib/curriculum";

function localize(label: CurriculumLabel, locale: "en" | "ar"): string {
  return locale === "ar" ? label.ar : label.en;
}

function findLabel(
  lists: { value: string; label: CurriculumLabel }[][],
  value: string | null | undefined,
): CurriculumLabel | null {
  if (!value) return null;
  for (const list of lists) {
    const entry = list.find((item) => item.value === value);
    if (entry) return entry.label;
  }
  return null;
}

export function yearLabel(
  value: string | null | undefined,
  locale: "en" | "ar",
): string {
  const label = findLabel([YEARS], value);
  return label ? localize(label, locale) : "";
}

export function systemLabel(
  value: string | null | undefined,
  locale: "en" | "ar",
): string {
  const label = findLabel(Object.values(SYSTEMS), value);
  return label ? localize(label, locale) : "";
}

export function trackLabel(
  value: string | null | undefined,
  locale: "en" | "ar",
): string {
  const label = findLabel([BACCALAUREATE_TRACKS], value);
  return label ? localize(label, locale) : "";
}

export function electiveLabel(
  value: string | null | undefined,
  locale: "en" | "ar",
): string {
  const label = findLabel(Object.values(BACCALAUREATE_ELECTIVES), value);
  return label ? localize(label, locale) : "";
}

export function sectionLabel(
  value: string | null | undefined,
  locale: "en" | "ar",
): string {
  const label = findLabel(Object.values(SECTIONS), value);
  return label ? localize(label, locale) : "";
}