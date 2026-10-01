import { apiClient } from "./client";

export async function getZoomMeetings<T = unknown>() {
  const response = await apiClient.get<T>("livestream/zoom-meetings/");
  return response.data;
}

export async function createZoomMeeting<T = unknown>(
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<T>(
    "livestream/zoom-meetings/",
    payload,
  );
  return response.data;
}

export async function getZoomOAuth<T = unknown>() {
  const response = await apiClient.get<T>("livestream/oauth/");
  return response.data;
}

export async function createZoomSignature<T = unknown>(
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<T>("livestream/signiture/", payload);
  return response.data;
}

export async function getLiveMeetings<T = unknown>() {
  const response = await apiClient.get<T>("live/meetings/");
  return response.data;
}

export async function createLiveMeeting<T = unknown>(
  payload: Record<string, unknown>,
) {
  const response = await apiClient.post<T>("live/meetings/", payload);
  return response.data;
}

export async function refreshLiveMeetingToken<T = unknown>(
  meetingId: string | number,
) {
  const response = await apiClient.post<T>(
    `live/meetings/${meetingId}/refresh-token/`,
  );
  return response.data;
}
