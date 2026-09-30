import { createAxiosSSRInstance } from "./axiosServer";
import type { Group } from "../types/student";
import type { FieldOption, GradeOption, GroupFilters } from "./groupsApi";

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

export async function fetchGroupsSSR(filters: GroupFilters = {}): Promise<Group[]> {
  const instance = createAxiosSSRInstance();
  const { data } = await instance.get("/groups/", { params: toParams(filters) });
  return asList<Group>(data);
}

export async function fetchStudentGroupsSSR(): Promise<Group[]> {
  const instance = createAxiosSSRInstance();
  const { data } = await instance.get("/groups/student_groups/");
  return asList<Group>(data);
}

export async function fetchGradesSSR(schoolLevel?: string): Promise<GradeOption[]> {
  const instance = createAxiosSSRInstance();
  const { data } = await instance.get("/grades/", {
    params: schoolLevel ? { school_level: schoolLevel } : {},
  });
  return asList<GradeOption>(data);
}

export async function fetchFieldsSSR(
  options: { gradeId?: string; schoolLevel?: string } = {}
): Promise<FieldOption[]> {
  const params: Record<string, string> = {};
  if (options.gradeId) params.grade = options.gradeId;
  else if (options.schoolLevel) params.school_level = options.schoolLevel;

  const instance = createAxiosSSRInstance();
  const { data } = await instance.get("/fieldofstudy/", { params });
  return asList<FieldOption>(data);
}

export async function fetchCurrentUserSSR(): Promise<{ id: string; role: string } | null> {
  const instance = createAxiosSSRInstance();
  const { data } = await instance.get("/users/");
  const list = asList<{ id: string; role: string }>(data);
  return list[0] ?? null;
}
