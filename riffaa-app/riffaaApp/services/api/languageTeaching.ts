import { apiClient } from "./client";

export async function getLanguageTestQuestions<T = unknown>(
  languageId: string | number,
) {
  const response = await apiClient.get<T>(`lan/tests/${languageId}/questions/`);
  return response.data;
}

export async function getLanguages<T = unknown>() {
  const response = await apiClient.get<T>("lan/languages/");
  return response.data;
}

export async function getLanguageLevels<T = unknown>() {
  const response = await apiClient.get<T>("lan/language-level/");
  return response.data;
}

export async function getLanguageProficiencies<T = unknown>() {
  const response = await apiClient.get<T>("lan/language-proficiencies/");
  return response.data;
}

export async function submitLanguageTest<T = unknown>(
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<T>("lan/tests/submit/", payload);
  return response.data;
}
