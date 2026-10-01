import { apiClient } from "./client";

export async function getStudentFormEntries<T = unknown>() {
  const response = await apiClient.get<T>("studentform/");
  return response.data;
}

export async function createStudentFormEntry<T = unknown>(
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<T>("studentform/", payload);
  return response.data;
}

export async function updateStudentFormEntry<T = unknown>(
  id: string | number,
  payload: Record<string, unknown>,
) {
  const response = await apiClient.patch<T>(`studentform/${id}/`, payload);
  return response.data;
}

export async function deleteStudentFormEntry(id: string | number) {
  const response = await apiClient.delete(`studentform/${id}/`);
  return response.data;
}
