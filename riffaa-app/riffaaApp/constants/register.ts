/**
 * Registration option values. These are backend data (the `students/` API
 * stores the school year / branch as text and Django maps them to grades), so
 * they intentionally stay in Arabic and must not be translated.
 */
export const MIDDLE_YEARS = [
  'السنة الأولى متوسط',
  'السنة الثانية متوسط',
  'السنة الثالثة متوسط',
  'السنة الرابعة متوسط',
];

export const HIGH_YEARS = [
  'السنة الأولى ثانوي',
  'السنة الثانية ثانوي',
  'السنة الثالثة ثانوي',
];

export const HIGH_BRANCHES = [
  'آداب وفلسفة',
  'علوم تجريبية',
  'رياضيات',
  'تقني رياضي',
];
