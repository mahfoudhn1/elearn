import { render } from '@testing-library/react-native';

import {
  PlannerDayTimeline,
  type TimelineEntry,
} from '../components/planner/PlannerDayTimeline';
import type { PlannedSession } from '../services/api/planner';
import { setLocale } from '../services/i18n';
import { useSettingsStore } from '../store/settingsStore';

/**
 * The timeline is the densest schedule surface: session label, subject and the
 * start–end span. It must follow the app locale (JS-driven RTL), so we render it
 * once per locale and check the labels and the row direction actually change.
 */

function session(): PlannedSession {
  return {
    id: 'session-1',
    plan: 'plan-1',
    student: 'student-1',
    subject: 'Maths',
    activity_type: 'STUDY',
    type: 'study',
    label: 'STUDY',
    topic_id: null,
    topic_title_ar: null,
    phase: 'learn',
    part: null,
    parts: null,
    review_topic_id: null,
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
  };
}

const entries: TimelineEntry[] = [
  {
    key: 'planner-session-1',
    entryType: 'PLAN',
    kind: 'STUDY',
    title: 'Maths',
    subject: 'Maths',
    startMin: 540,
    endMin: 600,
    locked: false,
    session: session(),
  },
];

function applyLocale(locale: 'ar' | 'en') {
  useSettingsStore.setState({ locale });
  setLocale(locale);
}

describe('<PlannerDayTimeline /> locale rendering', () => {
  it('renders Arabic labels and a right-to-left row', async () => {
    applyLocale('ar');

    const screen = await render(
      <PlannerDayTimeline
        entries={entries}
        emptyLabel="لا شيء"
        onStartSession={() => {}}
      />,
    );

    expect(screen.getByText('Maths')).toBeTruthy();
    expect(screen.getByText('دراسة')).toBeTruthy();
    expect(screen.getByText('09:00 - 10:00')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toContain('"flexDirection":"row-reverse"');

    screen.unmount();
  });

  it('renders English labels under an LTR locale', async () => {
    applyLocale('en');

    const screen = await render(
      <PlannerDayTimeline
        entries={entries}
        emptyLabel="Nothing"
        onStartSession={() => {}}
      />,
    );

    expect(screen.getByText('Study')).toBeTruthy();
    expect(screen.getByText('09:00 - 10:00')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toContain('"flexDirection":"row"');

    screen.unmount();
  });
});
