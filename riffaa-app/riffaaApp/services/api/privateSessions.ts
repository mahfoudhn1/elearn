import { apiClient } from "./client";

export async function createSessionRequest<T = unknown>(
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<T>(
    "privet/session-requests/create/",
    payload,
  );
  return response.data;
}

export async function updateSessionRequest<T = unknown>(
  id: string | number,
  payload: Record<string, unknown>,
) {
  const response = await apiClient.put<T>(
    `privet/session-requests/update/${id}/`,
    payload,
  );
  return response.data;
}

export async function listSessionRequestsByStudent<T = unknown>(
  studentId: string | number,
) {
  const response = await apiClient.get<T>(
    `privet/session-requests/list/${studentId}/`,
  );
  return response.data;
}

export async function listSessionRequests<T = unknown>() {
  const response = await apiClient.get<T>("privet/session-requests/");
  return response.data;
}

export async function deleteSessionRequest(id: string | number) {
  const response = await apiClient.delete(
    `privet/session-requests/delete/${id}/`,
  );
  return response.data;
}

export async function getJitsiRoomForSession<T = unknown>(id: string | number) {
  const response = await apiClient.get<T>(
    `privet/session-requests/${id}/get_jitsi_room_for_session/`,
  );
  return response.data;
}

export async function uploadCheck<T = unknown>(
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<T>("privet/upload-check/", payload);
  return response.data;
}
