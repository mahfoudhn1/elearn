function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export interface NormalizedGroup {
  id: string;
  name: string;
  group_type: "ACADEMIC" | "LANGUAGE";
  status: string;
  teacher_name: string;
  avatar: string;
  students_count: number;
  unread_messages: number;
  active_live: boolean;
  school_level?: string;
  grade?: string;
  language?: string;
  language_level?: string;
  announcements: Array<Record<string, unknown>>;
  videos: Array<Record<string, unknown>>;
}

export interface NormalizedSchedule {
  id: string;
  title: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  completed: boolean;
  groupName: string;
  groupId: string;
}

export function getArrayFromPayload(
  payload: unknown,
): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload as Array<Record<string, unknown>>;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.results)) {
      return record.results as Array<Record<string, unknown>>;
    }

    if (Array.isArray(record.data)) {
      return record.data as Array<Record<string, unknown>>;
    }

    if (Array.isArray(record.groups)) {
      return record.groups as Array<Record<string, unknown>>;
    }

    if (Array.isArray(record.student_groups)) {
      return record.student_groups as Array<Record<string, unknown>>;
    }

    if (Array.isArray(record.items)) {
      return record.items as Array<Record<string, unknown>>;
    }

    if (Array.isArray(record.schedules)) {
      return record.schedules as Array<Record<string, unknown>>;
    }
  }

  return [];
}

export function normalizeGroup(
  rawGroup: Record<string, unknown> | null | undefined,
): NormalizedGroup {
  const group = getRecord(rawGroup);
  const groupTypeValue = String(group.group_type ?? group.type ?? "ACADEMIC");
  const normalizedType =
    groupTypeValue === "LANGUAGE" ? "LANGUAGE" : "ACADEMIC";

  const teacher = getRecord(group.teacher);
  const admin = getRecord(group.admin);
  const studentsCount = Array.isArray(group.students)
    ? group.students.length
    : 0;

  const teacherName = String(
    group.teacher_name ??
      teacher.name ??
      teacher.full_name ??
      admin.name ??
      "معلم",
  );

  const avatar = String(
    group.avatar ?? teacher.avatar ?? teacher.avatar_url ?? group.image ?? "",
  );

  const students = getRecord(group.students);

  return {
    id: String(group.id ?? ""),
    name: String(group.name ?? group.title ?? "مجموعة"),
    group_type: normalizedType,
    status: String(group.status ?? "open"),
    teacher_name: teacherName,
    avatar,
    students_count: Number(
      group.students_count ?? group.studentsCount ?? studentsCount ?? 0,
    ),
    unread_messages: Number(group.unread_messages ?? group.unreadMessages ?? 0),
    active_live: Boolean(
      group.active_live ?? group.activeLive ?? group.is_live ?? false,
    ),
    school_level: group.school_level ? String(group.school_level) : undefined,
    grade: group.grade ? String(group.grade) : undefined,
    language: group.language ? String(group.language) : undefined,
    language_level: group.language_level
      ? String(group.language_level)
      : undefined,
    announcements: getArrayFromPayload(
      group.announcements ??
        group.group_announcements ??
        group.announcement_list,
    ) as Array<Record<string, unknown>>,
    videos: getArrayFromPayload(
      group.videos ?? group.group_videos ?? group.video_list,
    ) as Array<Record<string, unknown>>,
  };
}

export function normalizeSchedule(
  rawSchedule: Record<string, unknown> | null | undefined,
): NormalizedSchedule {
  const schedule = getRecord(rawSchedule);
  const group = getRecord(schedule.group);
  const meeting = getRecord(schedule.meeting);
  const groupName = String(
    group.name ?? schedule.group_name ?? group.title ?? "مجموعة",
  );
  const groupId = String(group.id ?? schedule.group_id ?? "");

  return {
    id: String(schedule.id ?? `${Date.now()}-${Math.random()}`),
    title: String(
      schedule.title ??
        schedule.lesson_title ??
        schedule.lessonTitle ??
        meeting.title ??
        `${groupName || "جلسة"}`,
    ),
    subject: String(
      schedule.subject ?? schedule.lesson_subject ?? groupName ?? "درس",
    ),
    date: String(schedule.scheduled_date ?? schedule.date ?? ""),
    startTime: String(schedule.start_time ?? schedule.startTime ?? ""),
    endTime: String(schedule.end_time ?? schedule.endTime ?? ""),
    notes: String(schedule.notes ?? schedule.description ?? ""),
    completed: Boolean(schedule.completed ?? schedule.is_completed ?? false),
    groupName,
    groupId,
  };
}
