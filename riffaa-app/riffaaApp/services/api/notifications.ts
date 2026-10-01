import { apiClient } from "./client";

export async function getNotifications<T = unknown>() {
  const response = await apiClient.get<T>("notifications/");
  return response.data;
}

export async function getNotificationById<T = unknown>(id: string | number) {
  const response = await apiClient.get<T>(`notifications/${id}/`);
  return response.data;
}

export async function createNotification<T = unknown>(
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<T>("notifications/", payload);
  return response.data;
}

export async function markNotificationRead<T = unknown>(id: string | number) {
  const response = await apiClient.patch<T>(`notifications/${id}/`, {
    is_read: true,
  });
  return response.data;
}
