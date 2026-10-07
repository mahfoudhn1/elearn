import { useQuery } from '@tanstack/react-query';

import {
  getChapterReadiness,
  getFlashcardStats,
  getReadinessOverview,
  getSubjectReadiness,
  getTopicMastery,
} from '../../services/api/assessment';
import { getSubjectPlanning } from '../../services/api/planner';
import { queryKeys } from './queryKeys';

/** Readiness for every subject the student has evidence on. */
export function useReadinessOverview() {
  return useQuery({
    queryKey: queryKeys.readinessOverview(),
    queryFn: getReadinessOverview,
  });
}

export function useSubjectReadiness(subject: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subjectReadiness(subject ?? ''),
    queryFn: () => getSubjectReadiness(subject as string),
    enabled: Boolean(subject),
  });
}

export function useChapterReadiness(subject?: string) {
  return useQuery({
    queryKey: queryKeys.chapterReadiness(subject),
    queryFn: () => getChapterReadiness({ subject }),
  });
}

export function useTopicMastery(subject?: string) {
  return useQuery({
    queryKey: queryKeys.topicMastery(subject),
    queryFn: () => getTopicMastery({ subject }),
  });
}

export function useFlashcardStats() {
  return useQuery({
    queryKey: queryKeys.flashcardStats(),
    queryFn: getFlashcardStats,
  });
}

export function useSubjectPlanning() {
  return useQuery({
    queryKey: queryKeys.subjectPlanning(),
    queryFn: getSubjectPlanning,
  });
}
