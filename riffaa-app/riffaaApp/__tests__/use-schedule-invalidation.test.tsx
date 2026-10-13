import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useSchedule } from '../hooks/queries/useSchedule';
import { getCurrentPlan } from '../services/api/planner';

jest.mock('../services/api/schedule', () => {
  const actual = jest.requireActual('../services/api/schedule');
  return {
    __esModule: true,
    ...actual,
  };
});

jest.mock('../services/api/planner', () => ({
  __esModule: true,
  getCurrentPlan: jest.fn(),
}));

const mockedGetCurrentPlan = getCurrentPlan as jest.MockedFunction<typeof getCurrentPlan>;

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      // `gcTime: 0` keeps inactive queries from leaving a 5-minute GC timer
      // behind that would keep the Jest worker alive after the test.
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function useScheduleSurface() {
  return useSchedule();
}

describe('shared schedule query', () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentPlan.mockResolvedValue({ plan: null, sessions: [] });
    client = makeClient();
  });

  afterEach(() => {
    client.clear();
  });

  it('reads only planner sessions through the schedule query', async () => {
    const { result } = await renderHook(() => useScheduleSurface(), {
      wrapper: wrap(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetCurrentPlan).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([]);
  });
});
