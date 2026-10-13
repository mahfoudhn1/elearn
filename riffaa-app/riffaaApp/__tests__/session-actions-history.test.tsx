import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionActionsSheet } from '../components/planner/SessionActionsSheet';
import type { PlannedSessionEvent } from '../services/api/planner';
import { setLocale } from '../services/i18n';

jest.mock('../hooks/queries/usePlanner', () => ({
  usePlannedSessionEvents: jest.fn(),
}));

const { usePlannedSessionEvents } = jest.requireMock('../hooks/queries/usePlanner') as {
  usePlannedSessionEvents: jest.Mock;
};

const session = {
  id: 'session-1',
  plan: 'plan-1',
  student: 'student-1',
  subject: 'Maths',
  activity_type: 'STUDY',
  type: 'study',
  label: 'STUDY',
  topic_id: null,
  topic_title_ar: null,
  phase: 'learn' as const,
  part: null,
  parts: null,
  review_topic_id: null,
  start_dt: '2026-10-12T09:00:00.000Z',
  end_dt: '2026-10-12T10:00:00.000Z',
  focus_minutes: 45,
  origin: 'SYSTEM' as const,
  state: 'DONE' as const,
  is_locked: false,
  reasons: [],
  personal_item: null,
  replaced_by: null,
  created_at: '2026-10-10T00:00:00.000Z',
  updated_at: '2026-10-10T00:00:00.000Z',
};

const events: PlannedSessionEvent[] = [
  {
    id: 'generated', kind: 'GENERATED', from_state: '', to_state: 'PLANNED',
    study_session_uuid: null, occurred_at: '2026-10-12T08:00:00.000Z', metadata: {},
  },
  {
    id: 'tick', kind: 'STARTED', from_state: 'PLANNED', to_state: 'PLANNED',
    study_session_uuid: 'study-1', occurred_at: '2026-10-12T09:00:00.000Z', metadata: {},
  },
  {
    id: 'completed', kind: 'COMPLETED', from_state: 'PLANNED', to_state: 'DONE',
    study_session_uuid: 'study-1', occurred_at: '2026-10-12T09:40:00.000Z',
    metadata: { actual_focus_minutes: 38 },
  },
];

describe('SessionActionsSheet history', () => {
  beforeEach(() => {
    setLocale('en');
    usePlannedSessionEvents.mockReturnValue({ data: events, isLoading: false, isError: false });
  });

  it('shows status, planned/actual focus, and meaningful events without Pomodoro ticks', async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>
        <SessionActionsSheet
        visible
        session={session}
        onClose={() => {}}
        onStart={() => {}}
        onMove={() => {}}
        onLockToggle={() => {}}
        onSkip={() => {}}
        onDelete={() => {}}
        />
      </SafeAreaProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Planned 45/)).toBeTruthy());
    expect(screen.getByText(/actual 38 min/)).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Block generated')).toBeTruthy();
    expect(screen.getByText('Timer started')).toBeTruthy();
    expect(screen.queryByText('TICK')).toBeNull();
  });

  it('does not expose an ownership error response', async () => {
    usePlannedSessionEvents.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const screen = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>
        <SessionActionsSheet
        visible
        session={session}
        onClose={() => {}}
        onStart={() => {}}
        onMove={() => {}}
        onLockToggle={() => {}}
        onSkip={() => {}}
        onDelete={() => {}}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('History unavailable')).toBeTruthy();
    expect(screen.queryByText(/not found|owned|student-1/i)).toBeNull();
  });
});
