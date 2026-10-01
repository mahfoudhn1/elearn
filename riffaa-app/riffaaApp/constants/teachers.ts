/**
 * Teacher filter vocabulary shared by the Explore screen and the Courses tab's
 * Teachers segment.
 *
 * `GRADES` / `WILAYAS` are backend values, not display copy: the selected value
 * is sent as-is (wilaya) or mapped through `GRADE_API_MAP` (level enum), so they
 * must not be translated.
 */
export const GRADES = ['الكل', 'ثانوي', 'متوسط', 'ابتدائي'];

export const WILAYAS = ['الكل', 'الجزائر', 'وهران', 'قسنطينة'];

export const GRADE_API_MAP: Record<string, string> = {
  الكل: '',
  ابتدائي: 'PRIMARY',
  متوسط: 'MIDDLE',
  ثانوي: 'SECONDARY',
};
