import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  getPlannedSessionEvents,
  type PlannedSessionEvent,
} from '../services/api/planner';
import {
  invalidatePlannerEvidenceQueries,
  usePlannedSessionEvents,
} from '../hooks/queries/usePlanner';

jest.mock('../services/api/planner', () => {
  const actual = jest.requireActual('../services/api/planner');
  return { __esModule: true, ...actual, getPlannedSessionEvents: jest.fn() };
});

const mockedEvents = getPlannedSessionEvents as jest.MockedFunction<typeof getPlannedSessionEvents>;

const event: PlannedSessionEvent = {
  id: 'event-1',
  kind: 'COMPLETED',
  from_state: 'PLANNED',
  to_state: 'DONE',
  study_session_uuid: 'study-1',
  occurred_at: '2026-10-12T10:00:00.000Z',
  metadata: { actual_focus_minutes: 38 },
};

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('planned-session event query', () => {
  it('stays disabled until a block is selected', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const { result } = await renderHook(() => usePlannedSessionEvents(undefined), {
      wrapper: wrapper(client),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedEvents).not.toHaveBeenCalled();
    client.clear();
  });

  it('loads only the selected block and exposes ownership-safe errors', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    mockedEvents.mockResolvedValueOnce([event]);
    const { result } = await renderHook(() => usePlannedSessionEvents('session-1'), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.data).toEqual([event]));
    expect(mockedEvents).toHaveBeenCalledWith('session-1');

    mockedEvents.mockRejectedValueOnce({ response: { status: 404 } });
    const errorResult = await renderHook(() => usePlannedSessionEvents('not-owned'), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(errorResult.result.current.isError).toBe(true));
    expect(errorResult.result.current.data).toBeUndefined();
    errorResult.unmount();
    client.clear();
  });

  it('invalidates planner, proficiency, and assessment evidence queries together', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
    const invalidate = jest.spyOn(client, 'invalidateQueries').mockImplementation(async () => undefined);

    await invalidatePlannerEvidenceQueries(client);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['planner'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['planner', 'subject-proficiency'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['assessment'] });
    client.clear();
  });
});
