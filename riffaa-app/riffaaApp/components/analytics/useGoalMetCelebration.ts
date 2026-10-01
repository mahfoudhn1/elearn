import { useEffect, useRef, useState } from 'react';

import type { GoalWithProgress } from '../../services/api/goals';

/**
 * Detects the moment a goal flips to met so the screen can celebrate once.
 *
 * The first batch of data only seeds the "already met" set, so opening the
 * screen on an already-completed goal does not trigger a celebration.
 */
export function useGoalMetCelebration(goals: GoalWithProgress[] | undefined) {
  const [celebrated, setCelebrated] = useState<GoalWithProgress | null>(null);
  const metIds = useRef<Set<string>>(new Set());
  const initialised = useRef(false);

  useEffect(() => {
    if (!goals) return;

    if (!initialised.current) {
      initialised.current = true;
      goals.forEach((goal) => {
        if (goal.progress.met) metIds.current.add(goal.id);
      });
      return;
    }

    for (const goal of goals) {
      if (goal.progress.met && !metIds.current.has(goal.id)) {
        metIds.current.add(goal.id);
        setCelebrated(goal);
        break;
      }
      if (!goal.progress.met) {
        metIds.current.delete(goal.id);
      }
    }
  }, [goals]);

  return { celebrated, clear: () => setCelebrated(null) };
}
