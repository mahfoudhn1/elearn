/**
 * Central react-query key factory. Every hook and mutation imports its keys
 * from here so invalidations cannot drift from the queries they target.
 */
export const queryKeys = {
  courses: (params: { search?: string } = {}) => ['courses', params] as const,
  course: (id: number | string | undefined) => ['course', String(id)] as const,
  courseLessons: (id: number | string | undefined) =>
    ['course-lessons', String(id)] as const,
  courseMaterials: (id: number | string | undefined) =>
    ['course-materials', String(id)] as const,
  survey: (id: number | string | undefined) => ['survey', String(id)] as const,

  schedule: (query: Record<string, unknown> = {}) => ['schedule', query] as const,
  scheduleItem: (id: number | string) => ['schedule-item', String(id)] as const,

  groups: () => ['groups'] as const,
  groupClassSchedules: () => ['group-class-schedules'] as const,
  group: (id: number | string | undefined) => ['group', String(id)] as const,
  groupSchedules: (id: number | string | undefined) =>
    ['group-schedules', String(id)] as const,
  groupVideos: (id: number | string | undefined) => ['group-videos', String(id)] as const,

  notifications: () => ['notifications'] as const,

  teachers: (filters: Record<string, unknown> = {}) => ['teachers', filters] as const,
  teacher: (id: number | string | undefined) => ['teacher', String(id)] as const,
  profileGroups: (teacherId: number | string | undefined) =>
    ['profile-groups', String(teacherId)] as const,

  studyStats: (days: number) => ['study-stats', days] as const,
  coursesList: () => ['courses'] as const,

  goals: (includeInactive: boolean = false) =>
    ['goals', includeInactive ? 'all' : 'active'] as const,
  goal: (id: string) => ['goals', 'detail', String(id)] as const,
  goalProgress: () => ['goals', 'progress'] as const,
  goalHistory: (goalId: string, limit: number) =>
    ['goals', 'history', String(goalId), limit] as const,
  goalSuggestion: (metric: string, period: string) =>
    ['goals', 'suggestion', metric, period] as const,

  analyticsSummary: (range: string) =>
    ['analytics', 'summary', range] as const,
  weeklyPattern: (range?: string) =>
    ['analytics', 'weekly-pattern', range ?? 'all'] as const,
  studentCourseProgress: () => ['analytics', 'courses'] as const,

  readinessOverview: () => ['assessment', 'readiness', 'overview'] as const,
  subjectReadiness: (subject: string) =>
    ['assessment', 'readiness', 'subject', subject] as const,
  chapterReadiness: (subject?: string) =>
    ['assessment', 'mastery', 'chapters', subject ?? 'all'] as const,
  topicMastery: (subject?: string) =>
    ['assessment', 'mastery', 'topics', subject ?? 'all'] as const,
  flashcardStats: () => ['assessment', 'flashcards', 'stats'] as const,
  subjectPlanning: () => ['planner', 'subject-planning'] as const,
} as const;
