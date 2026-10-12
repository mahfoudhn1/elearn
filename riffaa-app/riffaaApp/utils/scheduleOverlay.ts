import type { TimelineEntry } from '../components/planner/PlannerDayTimeline';
import type { OnboardingState } from '../services/api/planner';
import { formatDate } from './format';

/**
 * Local-day helpers for the schedule surface.
 *
 * `ScheduleEntry.start`/`end` are timezone-aware ISO strings, but the agenda is
 * keyed by the student's *local* calendar day, so every screen must group rows
 * the same way. These helpers live here rather than inline in each screen so the
 * schedule tab and the plan panel cannot drift apart.
 */

/** `YYYY-MM-DD` for a `Date`, in local time (never UTC). */
export function toDayIso(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/** Shift a `YYYY-MM-DD` string by whole days, staying in local time. */
export function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return toDayIso(new Date(year, month - 1, day + days));
}

/** `HH:MM[:SS]` -> minutes since midnight, or null when unusable. */
export function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

/** Minutes since midnight for a `Date`. */
export function minutesSinceMidnight(value: Date): number {
  return value.getHours() * 60 + value.getMinutes();
}

/** JavaScript weekday of a local day (`0` = Sunday … `6` = Saturday). */
export function weekdayIndex(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDay();
}

/**
 * Canonical English weekday tokens the API is expected to send. Kept separate
 * from any display locale so matching never depends on the app language.
 */
const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Does a backend weekday value refer to the given local day?
 *
 * Accepts the canonical English tokens above and, as a fallback for older
 * payloads, a weekday already rendered in the app's own locale. This replaces
 * the previous hard-coded `en-US` comparison.
 */
export function matchesWeekday(iso: string, raw: unknown): boolean {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return false;

  const canonical = WEEKDAY_INDEX[value];
  if (canonical != null) return canonical === weekdayIndex(iso);

  return (
    formatDate(new Date(`${iso}T00:00:00`), { weekday: 'long' }).toLowerCase() === value
  );
}

/**
 * Read-only busy blocks for one local day from the onboarding feed: school
 * commitments, group lessons and private sessions. These are overlays on top of
 * the student's own schedule rows, never editable study sessions.
 */
export function busyEntriesForDay(
  state: OnboardingState | null,
  iso: string,
): TimelineEntry[] {
  if (!state) return [];
  // Backend commitments use 0 = Monday … 6 = Sunday; JS uses 0 = Sunday.
  const backendWeekday = (weekdayIndex(iso) + 6) % 7;
  const entries: TimelineEntry[] = [];

  for (const commitment of state.school_commitments) {
    if (commitment.weekday !== backendWeekday) continue;
    if (commitment.valid_from && iso < commitment.valid_from) continue;
    if (commitment.valid_to && iso > commitment.valid_to) continue;
    const start = timeToMinutes(commitment.start_time);
    const end = timeToMinutes(commitment.end_time);
    if (start == null || end == null) continue;
    entries.push({
      key: `commitment-${commitment.id}`,
      entryType: 'CLASS',
      kind: commitment.kind,
      title: commitment.title,
      startMin: start,
      endMin: end,
      locked: true,
    });
  }

  for (const raw of state.group_schedules as Record<string, unknown>[]) {
    const start = timeToMinutes(raw.start_time as string);
    const end = timeToMinutes(raw.end_time as string);
    if (start == null || end == null) continue;
    if (!matchesWeekday(iso, raw.day_of_week) && raw.scheduled_date !== iso) continue;
    entries.push({
      key: `group-${String(raw.id)}`,
      entryType: 'CLASS',
      kind: 'GROUP_LESSON',
      title: String(raw.group_name ?? ''),
      startMin: start,
      endMin: end,
      locked: true,
    });
  }

  for (const raw of state.private_sessions as Record<string, unknown>[]) {
    const sessionDate = String(raw.session_date ?? '').slice(0, 10);
    if (sessionDate !== iso) continue;
    const startedAt = new Date(String(raw.session_date));
    if (Number.isNaN(startedAt.getTime())) continue;
    const start = minutesSinceMidnight(startedAt);
    entries.push({
      key: `private-${String(raw.id)}`,
      entryType: 'CLASS',
      kind: 'PRIVATE_SESSION',
      title: state.available_subjects[0] ?? '',
      startMin: start,
      endMin: start + 60,
      locked: true,
    });
  }

  return entries;
}
