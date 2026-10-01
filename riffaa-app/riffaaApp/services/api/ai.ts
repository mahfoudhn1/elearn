import { apiClient } from "./client";

export async function interactWithAI<T = unknown>(
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<T>("ai/interact/", payload);
  return response.data;
}
