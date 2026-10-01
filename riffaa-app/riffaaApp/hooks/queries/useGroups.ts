import { useQuery } from '@tanstack/react-query';

import {
  getGroupById,
  getGroupClassSchedules,
  getGroupSchedules,
  getGroupVideos,
  getStudentGroups,
} from '../../services/api';
import { queryKeys } from './queryKeys';

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups(),
    queryFn: () => getStudentGroups(),
  });
}

/** Class sessions across all of the student's groups (used for "next session"). */
export function useGroupClassSchedules() {
  return useQuery({
    queryKey: queryKeys.groupClassSchedules(),
    queryFn: () => getGroupClassSchedules(),
  });
}

export function useGroup(id: number | string | undefined) {
  return useQuery({
    queryKey: queryKeys.group(id),
    queryFn: () => getGroupById(id as string),
    enabled: Boolean(id),
  });
}

export function useGroupSchedules(id: number | string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupSchedules(id),
    queryFn: () => getGroupSchedules(id as string),
    enabled: Boolean(id),
  });
}

export function useGroupVideos(id: number | string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupVideos(id),
    queryFn: () => getGroupVideos(id as string),
    enabled: Boolean(id),
  });
}
