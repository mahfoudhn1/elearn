import { apiClient } from "./client";

/**
 * Personal study schedule: tasks and exams a student books for themselves.
 *
 * Backed by Django's `schedule` app at `/api/schedule/` (PersonalScheduleItem).
 * Not to be confused with group class schedules, which are a teacher-owned
 * timetable under `/api/groups/schedules/` -- see `getGroupClassSchedules`.
 *
 * The backend speaks `start_datetime` / `end_datetime` (timezone-aware ISO) plus
 * an `item_type` / `status` / `priority` triple. The friendlier
 * `{ date, start_time, end_time }` shape the UI works in is mapped here, in one
 * place, rather than leaking datetime assembly into every screen.
 */

export type ScheduleItemType = "TASK" | "EXAM";
export type SchedulePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ScheduleStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "UPCOMING"
  | "MISSED";

/** A schedule item exactly as the API returns it. */
export interface ScheduleItem {
  id: string;
  title: string;
  description: string | null;
  item_type: ScheduleItemType;
  status: ScheduleStatus;
  priority: SchedulePriority;
  start_datetime: string;
  end_datetime: string;
  subject: string | null;
  group: string | null;
  location: string | null;
  notes: string | null;
  progress_percentage: number;
  estimated_duration_minutes: number | null;
  target_prep_minutes: number | null;
  actual_duration_minutes: number | null;
  actual_start_time: string | null;
  completed_at: string | null;
}

/** What the create/edit form collects. */
export interface SchedulePayload {
  title: string;
  subject?: string | null;
  /** Calendar day as `YYYY-MM-DD`. */
  date: string;
  /** Wall-clock `HH:MM`. */
  start_time: string;
  /** Wall-clock `HH:MM`. */
  end_time: string;
  notes?: string | null;
  item_type?: ScheduleItemType;
  status?: ScheduleStatus;
  priority?: SchedulePriority;
  group?: string | null;
  location?: string | null;
  /**
   * Weekday numbers (0 = Sunday ... 6 = Saturday) to repeat on. Only meaningful
   * to `createRecurringSchedules`; a single `createSchedule` ignores it.
   */
  days?: number[];
}

export interface ScheduleQuery {
  /** ISO datetime lower bound. */
  start?: string;
  /** ISO datetime upper bound. */
  end?: string;
  type?: ScheduleItemType;
  status?: ScheduleStatus;
  subject?: string;
  group?: string;
}

const DEFAULTS: Record<ScheduleItemType, { status: ScheduleStatus; priority: SchedulePriority }> = {
  TASK: { status: "TODO", priority: "MEDIUM" },
  EXAM: { status: "UPCOMING", priority: "HIGH" },
};

/**
 * Combine a `YYYY-MM-DD` day and an `HH:MM` time into a timezone-aware ISO
 * string. Built through a local `Date` so the device's own offset is carried --
 * the API rejects naive datetimes outright.
 */
export function toIsoDateTime(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new Error(`تاريخ أو وقت غير صالح: ${date} ${time}`);
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

/** Shift a `YYYY-MM-DD` string by whole days, staying in local time. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1, day + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

function buildBody(payload: SchedulePayload) {
  const itemType = payload.item_type ?? "TASK";
  const defaults = DEFAULTS[itemType];

  return {
    title: payload.title.trim(),
    subject: payload.subject?.trim() || null,
    item_type: itemType,
    status: payload.status ?? defaults.status,
    priority: payload.priority ?? defaults.priority,
    start_datetime: toIsoDateTime(payload.date, payload.start_time),
    end_datetime: toIsoDateTime(payload.date, payload.end_time),
    notes: payload.notes?.trim() || null,
    group: payload.group ?? null,
    location: payload.location?.trim() || null,
  };
}

/** Fetch the student's own schedule items. */
export async function getSchedules(query: ScheduleQuery = {}) {
  const response = await apiClient.get<any>("schedule/", { params: query });
  // يتعامل مع pagination أو direct array
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data?.results || [];
}
/** Today's items only -- served by a dedicated endpoint, no client filtering. */
export async function getTodaySchedules() {
  const response = await apiClient.get<ScheduleItem[]>("schedule/today/");
  return response.data;
}

export async function createSchedule(payload: SchedulePayload) {
  const response = await apiClient.post<ScheduleItem>("schedule/", buildBody(payload));
  return response.data;
}

export async function updateSchedule(
  id: string,
  payload: Partial<SchedulePayload>,
) {
  // A partial edit still has to send a whole datetime, so date and time are
  // required together whenever either one moves.
  const body: Record<string, unknown> = {};

  if (payload.title !== undefined) body.title = payload.title.trim();
  if (payload.subject !== undefined) body.subject = payload.subject?.trim() || null;
  if (payload.notes !== undefined) body.notes = payload.notes?.trim() || null;
  if (payload.item_type !== undefined) body.item_type = payload.item_type;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.priority !== undefined) body.priority = payload.priority;
  if (payload.group !== undefined) body.group = payload.group ?? null;
  if (payload.location !== undefined) body.location = payload.location?.trim() || null;

  if (payload.date && payload.start_time) {
    body.start_datetime = toIsoDateTime(payload.date, payload.start_time);
  }
  if (payload.date && payload.end_time) {
    body.end_datetime = toIsoDateTime(payload.date, payload.end_time);
  }

  const response = await apiClient.patch<ScheduleItem>(`schedule/${id}/`, body);
  return response.data;
}

export async function deleteSchedule(id: string) {
  await apiClient.delete(`schedule/${id}/`);
  return id;
}

export interface RecurringResult {
  created: ScheduleItem[];
  failed: { date: string; message: string }[];
  /** Occurrences dropped because the expansion hit MAX_RECURRING_ITEMS. */
  truncated: number;
}

/**
 * Hard ceiling on one repeat expansion.
 *
 * Each occurrence is its own POST, and the API throttles authenticated users at
 * 1000 requests/hour -- an unbounded "every day for a year" would both hammer
 * the server and sit behind a single spinner for minutes.
 */
export const MAX_RECURRING_ITEMS = 28;

/**
 * Expand a repeating entry into one item per selected weekday over the next
 * `weeks`, and post them one at a time.
 *
 * PersonalScheduleItem has no recurrence field, so "repeat" genuinely means
 * several rows. Posting is sequential and partial failure is reported rather
 * than thrown: the API rejects items that clash with an existing session, and
 * one clashing day should not discard the days that did save.
 *
 * `onProgress` is called after each attempt so the caller can show real progress
 * instead of an opaque spinner.
 */
export async function createRecurringSchedules(
  payload: SchedulePayload,
  weeks = 1,
  onProgress?: (completed: number, total: number) => void,
): Promise<RecurringResult> {
  const days = payload.days ?? [];
  if (days.length === 0) {
    return { created: [await createSchedule(payload)], failed: [], truncated: 0 };
  }

  const [year, month, day] = payload.date.split("-").map(Number);
  const anchor = new Date(year, month - 1, day);
  const anchorWeekday = anchor.getDay();

  const dates = new Set<string>();
  for (let week = 0; week < Math.max(weeks, 1); week += 1) {
    for (const weekday of days) {
      const offset = ((weekday - anchorWeekday + 7) % 7) + week * 7;
      dates.add(addDays(payload.date, offset));
    }
  }

  const allDates = Array.from(dates).sort();
  const plannedDates = allDates.slice(0, MAX_RECURRING_ITEMS);
  const truncated = allDates.length - plannedDates.length;

  const created: ScheduleItem[] = [];
  const failed: RecurringResult["failed"] = [];

  for (const date of plannedDates) {
    try {
      created.push(await createSchedule({ ...payload, date }));
    } catch (error: any) {
      failed.push({
        date,
        message:
          error?.response?.data?.non_field_errors?.[0] ??
          error?.response?.data?.detail ??
          "تعذر إنشاء هذا الموعد",
      });
    }
    onProgress?.(created.length + failed.length, plannedDates.length);
  }

  return { created, failed, truncated };
}

/** How many rows a given repeat configuration would create. */
export function countRecurringOccurrences(days: number[], weeks: number): number {
  if (days.length === 0) return 1;
  return Math.min(days.length * Math.max(weeks, 1), MAX_RECURRING_ITEMS);
}

