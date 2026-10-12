import {
  normalizeScheduleEntries,
  type ScheduleItem,
} from '../services/api/schedule';
import type { PlannedSession } from '../services/api/planner';

/**
 * The adapter is the single place that decides which rows the schedule UI sees.
 * These tests pin the three row kinds (smart plan / manual task / planner
 * mirror) and the de-duplication rules the screens rely on.
 */

function plannedSession(overrides: Partial<PlannedSession> = {}): PlannedSession {
  return {
    id: 'session-1',
    plan: 'plan-1',
    student: 'student-1',
    subject: 'Maths',
    activity_type: 'STUDY',
    start_dt: '2026-10-12T09:00:00.000Z',
    end_dt: '2026-10-12T10:00:00.000Z',
    focus_minutes: 45,
    origin: 'SYSTEM',
    state: 'PLANNED',
    is_locked: false,
    reasons: [],
    personal_item: null,
    replaced_by: null,
    created_at: '2026-10-10T00:00:00.000Z',
    updated_at: '2026-10-10T00:00:00.000Z',
    ...overrides,
  };
}

function scheduleItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: 'item-1',
    title: 'Read chapter 3',
    description: null,
    item_type: 'TASK',
    status: 'TODO',
    priority: 'MEDIUM',
    start_datetime: '2026-10-12T14:00:00.000Z',
    end_datetime: '2026-10-12T15:00:00.000Z',
    subject: 'Physics',
    group: null,
    location: null,
    notes: null,
    progress_percentage: 0,
    estimated_duration_minutes: 60,
    target_prep_minutes: null,
    actual_duration_minutes: null,
    actual_start_time: null,
    completed_at: null,
    ...overrides,
  };
}

describe('normalizeScheduleEntries', () => {
  it('maps a smart-plan session to a planner entry with its focus minutes', () => {
    const entries = normalizeScheduleEntries([], [plannedSession()]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 'planner-session-1',
      source: 'PLANNER',
      title: 'Maths',
      topic: 'STUDY',
      status: 'PLANNED',
      focusMinutes: 45,
      plannedSessionId: 'session-1',
    });
    expect(entries[0].plannedSession?.id).toBe('session-1');
    expect(entries[0].scheduleItem).toBeNull();
  });

  it('keeps a manual task that is not linked to any planner session', () => {
    const entries = normalizeScheduleEntries([scheduleItem()], []);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 'schedule-item-1',
      source: 'MANUAL',
      title: 'Read chapter 3',
      status: 'TODO',
      focusMinutes: 60,
      scheduleItemId: 'item-1',
    });
    expect(entries[0].scheduleItem?.id).toBe('item-1');
  });

  it('never renders a planner mirror as a manual row', () => {
    // A mirror can survive server-side cleanup with no matching session; it must
    // still be hidden rather than shown as a duplicate manual task.
    const mirror = scheduleItem({ id: 'mirror-1', source: 'PLANNER' });

    expect(normalizeScheduleEntries([mirror], [])).toEqual([]);
  });

  it('drops a mirror linked to its planner session by id', () => {
    const mirror = scheduleItem({
      id: 'mirror-1',
      source: 'PLANNER',
      planned_session_id: 'session-1',
    });

    const entries = normalizeScheduleEntries([mirror], [plannedSession()]);

    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe('PLANNER');
    expect(entries[0].plannedSessionId).toBe('session-1');
  });

  it('drops a manual row linked through the session personal_item', () => {
    const linked = scheduleItem({ id: 'linked-1', source: 'MANUAL' });
    const session = plannedSession({ personal_item: 'linked-1' });

    const entries = normalizeScheduleEntries([linked], [session]);

    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe('PLANNER');
    expect(entries[0].scheduleItemId).toBe('linked-1');
  });

  it('renders a cancelled planner session instead of its mirror', () => {
    const mirror = scheduleItem({
      id: 'mirror-2',
      source: 'PLANNER',
      planned_session_id: 'session-2',
    });
    const cancelled = plannedSession({ id: 'session-2', state: 'CANCELLED' });

    const entries = normalizeScheduleEntries([mirror], [cancelled]);

    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe('CANCELLED');
    expect(entries[0].plannedSessionId).toBe('session-2');
  });

  it('coalesces a mixed day and sorts rows by start time', () => {
    const manual = scheduleItem({
      id: 'task-late',
      start_datetime: '2026-10-12T16:00:00.000Z',
      end_datetime: '2026-10-12T17:00:00.000Z',
    });
    const mirror = scheduleItem({
      id: 'mirror-3',
      source: 'PLANNER',
      planned_session_id: 'session-3',
      start_datetime: '2026-10-12T09:00:00.000Z',
      end_datetime: '2026-10-12T10:00:00.000Z',
    });
    const session = plannedSession({
      id: 'session-3',
      start_dt: '2026-10-12T09:00:00.000Z',
      end_dt: '2026-10-12T10:00:00.000Z',
    });

    const entries = normalizeScheduleEntries([manual, mirror], [session]);

    expect(entries.map((entry) => entry.id)).toEqual([
      'planner-session-3',
      'schedule-task-late',
    ]);
    expect(entries.map((entry) => entry.source)).toEqual(['PLANNER', 'MANUAL']);
  });

  it('reports a missing focus_minutes as null rather than guessing', () => {
    const entries = normalizeScheduleEntries(
      [],
      [plannedSession({ focus_minutes: undefined })],
    );

    expect(entries[0].focusMinutes).toBeNull();
  });
});
