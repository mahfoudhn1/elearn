import axiosClientInstance from "./axiosInstance";
import type { Group } from "../types/student";

export interface GroupFilters {
  schoolLevel?: string;
  grade?: string;
  fieldOfStudy?: string;
  languageName?: string;
  teacherId?: string;
  mine?: boolean;
  status?: string;
}

export interface GradeOption {
  id: string;
  name: string;
  school_level: string;
}

export interface FieldOption {
  id: string;
  name: string;
  grade: string | null;
  grade_name: string | null;
}

export interface GroupRequest {
  id: string;
  group: string | Group;
  student: unknown;
  is_accepted: boolean;
  is_rejected: boolean;
}

function toParams(filters: GroupFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.schoolLevel) params.school_level = filters.schoolLevel;
  if (filters.grade) params.grade = filters.grade;
  if (filters.fieldOfStudy) params.field_of_study = filters.fieldOfStudy;
  if (filters.languageName) params.language_name = filters.languageName;
  if (filters.teacherId) params.teacher_id = filters.teacherId;
  if (filters.status) params.status = filters.status;
  if (filters.mine) params.mine = "1";
  return params;
}

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

/** Browse the open-groups catalogue with optional filters. */
export async function fetchGroups(filters: GroupFilters = {}): Promise<Group[]> {
  const { data } = await axiosClientInstance.get("/groups/", {
    params: toParams(filters),
  });
  return asList<Group>(data);
}

/** Groups the authenticated student belongs to. */
export async function fetchStudentGroups(): Promise<Group[]> {
  const { data } = await axiosClientInstance.get("/groups/student_groups/");
  return asList<Group>(data);
}

/** Groups the authenticated teacher administers. */
export async function fetchTeacherGroups(): Promise<Group[]> {
  const { data } = await axiosClientInstance.get("/groups/teacher_groups/");
  return asList<Group>(data);
}

/** A teacher's groups shown on their public profile. */
export async function fetchProfileGroups(teacherId: string): Promise<Group[]> {
  const { data } = await axiosClientInstance.get("/groups/profile_groups/", {
    params: { teacher_id: teacherId },
  });
  return asList<Group>(data);
}

export async function fetchGroup(id: string): Promise<Group> {
  const { data } = await axiosClientInstance.get(`/groups/${id}/`);
  return data;
}

export async function createGroup(payload: Record<string, unknown>): Promise<Group> {
  const { data } = await axiosClientInstance.post("/groups/", payload);
  return data;
}

export async function deleteGroup(id: string): Promise<void> {
  await axiosClientInstance.delete(`/groups/${id}/`);
}

/** Ask to join a group (students only; requires an active subscription). */
export async function joinGroup(groupId: string): Promise<GroupRequest> {
  const { data } = await axiosClientInstance.post("/groups/student-requests/", {
    group_id: groupId,
  });
  return data;
}

/** Pending/accepted/rejected join requests for the authenticated teacher. */
export async function fetchTeacherRequests(groupId?: string): Promise<GroupRequest[]> {
  const { data } = await axiosClientInstance.get("/groups/teacher-requests/", {
    params: groupId ? { group_id: groupId } : {},
  });
  return asList<GroupRequest>(data);
}

export async function acceptGroupRequest(requestId: string): Promise<void> {
  await axiosClientInstance.patch(`/groups/student-requests/${requestId}/`, {
    accept: true,
  });
}

export async function rejectGroupRequest(requestId: string): Promise<void> {
  await axiosClientInstance.patch(`/groups/student-requests/${requestId}/`, {
    reject: true,
  });
}

/** Grades for a school level (e.g. "ثانوي"). */
export async function fetchGrades(schoolLevel?: string): Promise<GradeOption[]> {
  const { data } = await axiosClientInstance.get("/grades/", {
    params: schoolLevel ? { school_level: schoolLevel } : {},
  });
  return asList<GradeOption>(data);
}

/** Fields of study, optionally narrowed to a grade or school level. */
export async function fetchFields(
  options: { gradeId?: string; schoolLevel?: string } = {}
): Promise<FieldOption[]> {
  const params: Record<string, string> = {};
  if (options.gradeId) params.grade = options.gradeId;
  else if (options.schoolLevel) params.school_level = options.schoolLevel;

  const { data } = await axiosClientInstance.get("/fieldofstudy/", { params });
  return asList<FieldOption>(data);
}
