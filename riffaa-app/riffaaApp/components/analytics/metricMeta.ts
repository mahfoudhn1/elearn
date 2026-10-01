import type { GoalMetric } from '../../services/api/goals';
import type { IoniconName } from '../ui/types';

export interface MetricMeta {
  icon: IoniconName;
  /** i18n key for the metric name. */
  labelKey: string;
  /** i18n key for the unit shown next to numbers. */
  unitKey: string;
}

/** Display metadata for each goal metric, shared by cards, tiles and pickers. */
export const METRIC_META: Record<GoalMetric, MetricMeta> = {
  WATCH_MINUTES: {
    icon: 'time-outline',
    labelKey: 'watchMinutes',
    unitKey: 'unitMinutes',
  },
  STUDY_MINUTES: {
    icon: 'timer-outline',
    labelKey: 'studyMinutes',
    unitKey: 'unitMinutes',
  },
  LESSONS_COMPLETED: {
    icon: 'book-outline',
    labelKey: 'lessonsCompleted',
    unitKey: 'unitLessons',
  },
  QUIZZES_SUBMITTED: {
    icon: 'checkmark-done-outline',
    labelKey: 'quizzesSubmitted',
    unitKey: 'unitQuizzes',
  },
};

export const GOAL_METRICS: GoalMetric[] = [
  'WATCH_MINUTES',
  'STUDY_MINUTES',
  'LESSONS_COMPLETED',
  'QUIZZES_SUBMITTED',
];

export function metricMeta(metric: GoalMetric): MetricMeta {
  return METRIC_META[metric];
}
