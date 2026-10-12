import { QueryClient } from '@tanstack/react-query';

import { invalidatePomodoroLinkedQueries } from '../components/PomodoroRuntime';

describe('Pomodoro linked block refresh', () => {
  it('refreshes the schedule, planner, and selected block history on close', () => {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
    const invalidate = jest.spyOn(client, 'invalidateQueries').mockImplementation(async () => undefined);

    invalidatePomodoroLinkedQueries(client, 'planned-1');

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['schedule'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['planner'] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['planner', 'session-events', 'planned-1'],
    });
    client.clear();
  });
});
