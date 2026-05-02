export const CLASS_SECTION_DEFAULT = 'alef';

export const CLASS_SECTIONS = [
  { value: 'alef', ar: 'ألف', he: 'א', en: 'A' },
  { value: 'bet', ar: 'باء', he: 'ב', en: 'B' },
  { value: 'gimel', ar: 'جيم', he: 'ג', en: 'C' },
  { value: 'dalet', ar: 'دال', he: 'ד', en: 'D' },
];

export function normalizeClassSection(value) {
  const raw = String(value || '').trim().toLowerCase();
  const found = CLASS_SECTIONS.find(
    (section) =>
      section.value === raw ||
      section.ar === value ||
      section.he === value ||
      section.en.toLowerCase() === raw
  );

  return found?.value || CLASS_SECTION_DEFAULT;
}

export function getClassSectionLabel(value, language = 'ar') {
  const sectionValue = normalizeClassSection(value);
  const section = CLASS_SECTIONS.find((item) => item.value === sectionValue) || CLASS_SECTIONS[0];
  const lang = String(language || '').toLowerCase();

  if (lang.startsWith('he')) return section.he;
  if (lang.startsWith('en')) return section.en;
  return section.ar;
}

export function getClassSectionOptions(language = 'ar') {
  const lang = String(language || '').toLowerCase();
  return CLASS_SECTIONS.map((section) => ({
    value: section.value,
    label: lang.startsWith('he') ? section.he : lang.startsWith('en') ? section.en : section.ar,
  }));
}

export function buildClassLabel(grade, section, language = 'ar') {
  const gradeText = grade || '-';
  const sectionText = getClassSectionLabel(section, language);
  const lang = String(language || '').toLowerCase();

  if (lang.startsWith('he')) return `כיתה ${gradeText}${sectionText}`;
  if (lang.startsWith('en')) return `Grade ${gradeText}${sectionText}`;
  return `صف ${gradeText} ${sectionText}`;
}
