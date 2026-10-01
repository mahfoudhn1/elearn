import type { IoniconName } from '../components/ui/types';
import type { Course, Group } from '../types';

/**
 * Subject personality colours. These are deliberately separate from the brand
 * orange: orange stays the action signal, subjects are identity only.
 */
export type SubjectKind =
  | 'maths'
  | 'sciences'
  | 'languages'
  | 'humanities'
  | 'tech'
  | 'other';

export interface SubjectTint {
  kind: SubjectKind;
  /** Subject colour from the fixed palette. */
  color: string;
  /** Ionicons glyph used for the subject chip. */
  icon: IoniconName;
}

const TINTS: Record<SubjectKind, { color: string; icon: IoniconName }> = {
  maths: { color: '#38BDF8', icon: 'calculator-outline' },
  sciences: { color: '#34D399', icon: 'flask-outline' },
  languages: { color: '#A78BFA', icon: 'language-outline' },
  humanities: { color: '#FB7185', icon: 'earth-outline' },
  tech: { color: '#22D3EE', icon: 'hardware-chip-outline' },
  other: { color: '#94A3B8', icon: 'school-outline' },
};

const MATCHERS: Array<{ kind: SubjectKind; needles: string[] }> = [
  {
    kind: 'maths',
    needles: ['math', 'رياض', 'حساب', 'جبر', 'هندسة', 'algebra', 'geometry'],
  },
  {
    kind: 'sciences',
    needles: [
      'science',
      'physic',
      'chem',
      'biolog',
      'علوم',
      'فيزياء',
      'كيمياء',
      'أحياء',
      'احياء',
    ],
  },
  {
    kind: 'languages',
    needles: [
      'language',
      'english',
      'french',
      'arabic',
      'spanish',
      'german',
      'لغة',
      'انجليز',
      'إنجليز',
      'فرنس',
      'عربي',
    ],
  },
  {
    kind: 'humanities',
    needles: [
      'histor',
      'geograph',
      'philosoph',
      'literat',
      'social',
      'art',
      'تاريخ',
      'جغرافيا',
      'فلسفة',
      'أدب',
      'فنون',
      'اجتماع',
      'إسلام',
      'اسلام',
      'تربية',
    ],
  },
  {
    kind: 'tech',
    needles: [
      'tech',
      'comput',
      'informat',
      'program',
      'coding',
      'إعلام',
      'اعلام',
      'حاسوب',
      'برمجة',
      'تقني',
    ],
  },
];

/**
 * Maps a free-text subject to a stable colour + icon. Unknown or missing values
 * fall back to slate so a card never renders an empty chip.
 */
export function subjectTint(subject?: string | null): SubjectTint {
  const value = (subject ?? '').toLowerCase();
  const match = MATCHERS.find(({ needles }) =>
    needles.some((needle) => value.includes(needle)),
  );
  const kind = match?.kind ?? 'other';
  return { kind, ...TINTS[kind] };
}

/**
 * Subject values accepted by the schedule API (`users.subjsctChoice`). These are
 * backend data values, so they stay untranslated.
 */
export const SUBJECT_OPTIONS = [
  'رياضيات',
  'فيزياء',
  'كيمياء',
  'أحياء',
  'فرنسية',
  'عربية',
  'إنجليزية',
  'تاريخ',
  'جغرافيا',
  'فلسفة',
  'اقتصاد',
];

/** Best available subject label for a course (backend exposes it on the teacher). */
export function courseSubject(course: Course): string | null {
  return course.teacher?.teaching_subjects ?? null;
}

/** Best available subject label for a group, by group type. */
export function groupSubject(group: Group): string | null {
  return (
    group.language ??
    group.field_of_study ??
    group.grade ??
    group.school_level ??
    group.name ??
    null
  );
}
