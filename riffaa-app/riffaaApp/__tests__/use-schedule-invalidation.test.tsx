import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useSchedule, useScheduleMutations } from '../hooks/queries/useSchedule';
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  type ScheduleItem,
} from '../services/api/schedule';
import { getCurrentPlan } from '../services/api/planner';

jest.mock('../services/api/schedule', () => {
  const actual = jest.requireActual('../services/api/schedule');
  return {
    __esModule: true,
    ...actual,
    getSchedules: jest.fn(),
    createSchedule: jest.fn(),
    deleteSchedule: jest.fn(),
  };
});

jest.mock('../services/api/planner', () => ({
  __esModule: true,
  getCurrentPlan: jest.fn(),
}));

const mockedGetSchedules = getSchedules as jest.MockedFunction<typeof getSchedules>;
const mockedGetCurrentPlan = getCurrentPlan as jest.MockedFunction<typeof getCurrentPlan>;
const mockedCreate = createSchedule as jest.MockedFunction<typeof createSchedule>;
const mockedDelete = deleteSchedule as jest.MockedFunction<typeof deleteSchedule>;

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
  const schedule = useSchedule();
  const mutations = useScheduleMutations();
  return { schedule, mutations };
}

describe('shared schedule query', () => {
  let client: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSchedules.mockResolvedValue([]);
    mockedGetCurrentPlan.mockResolvedValue({ plan: null, sessions: [] });
    client = makeClient();
  });

  afterEach(() => {
    client.clear();
  });

  it('reads both endpoints through a single schedule query key', async () => {
    const { result } = await renderHook(() => useScheduleSurface(), {
      wrapper: wrap(client),
    });

    await waitFor(() => expect(result.current.schedule.isSuccess).toBe(true));

    expect(mockedGetSchedules).toHaveBeenCalledTimes(1);
    expect(mockedGetCurrentPlan).toHaveBeenCalledTimes(1);
    expect(result.current.schedule.data).toEqual([]);
  });

  it('invalidates and refetches the schedule after a create', async () => {
    mockedCreate.mockResolvedValue({ id: 'new-item' } as ScheduleItem);

    const { result } = await renderHook(() => useScheduleSurface(), {
      wrapper: wrap(client),
    });
    await waitFor(() => expect(result.current.schedule.isSuccess).toBe(true));
    expect(mockedGetSchedules).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.mutations.create.mutateAsync({
        title: 'New task',
        date: '2026-10-12',
        start_time: '09:00',
        end_time: '10:00',
      });
    });

    await waitFor(() => expect(mockedGetSchedules).toHaveBeenCalledTimes(2));
    expect(mockedGetCurrentPlan).toHaveBeenCalledTimes(2);
  });

  it('invalidates and refetches the schedule after a delete', async () => {
    mockedDelete.mockResolvedValue('item-1');

    const { result } = await renderHook(() => useScheduleSurface(), {
      wrapper: wrap(client),
    });
    await waitFor(() => expect(result.current.schedule.isSuccess).toBe(true));
    expect(mockedGetSchedules).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.mutations.remove.mutateAsync('item-1');
    });

    await waitFor(() => expect(mockedGetSchedules).toHaveBeenCalledTimes(2));
  });
});
