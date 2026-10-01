import { useQuery } from '@tanstack/react-query';

import { getProfileGroups } from '../../services/api/groups';
import { getTeacherById, getTeachers } from '../../services/api/teachers';
import { queryKeys } from './queryKeys';

export interface TeacherFilters {
  search?: string;
  subject_id?: string | number;
  teaching_level?: string;
  wilaya?: string;
  page?: number;
}

export function useTeachers(filters: TeacherFilters = {}) {
  return useQuery({
    queryKey: queryKeys.teachers(filters as Record<string, unknown>),
    queryFn: () => getTeachers<unknown[]>(filters),
  });
}

export function useTeacher(id: number | string | undefined) {
  return useQuery({
    queryKey: queryKeys.teacher(id),
    queryFn: () => getTeacherById(id as string),
    enabled: Boolean(id),
  });
}

export function useProfileGroups(teacherId: number | string | undefined) {
  return useQuery({
    queryKey: queryKeys.profileGroups(teacherId),
    queryFn: () => getProfileGroups(teacherId as string),
    enabled: Boolean(teacherId),
  });
}
