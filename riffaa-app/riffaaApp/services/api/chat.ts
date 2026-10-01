import { apiClient } from "./client";

export interface ChatMessageResponse {
  id: number;
  group: number;
  sender: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    avatar_url: string;
    avatar_file: string;
    avatar: string;
  };
  sender_name: string;
  message: string | null;
  file: string | null;
  file_url: string | null;
  is_pinned: boolean;
  created: string;
}

export async function getChatMessages(groupId?: string | number) {
  const response = await apiClient.get<
    ChatMessageResponse[] | { results: ChatMessageResponse[] }
  >("chat/", {
    params: groupId ? { group: groupId } : undefined,
  });
  return Array.isArray(response.data)
    ? response.data
    : response.data.results || [];
}

export async function getChatMessageById(id: string | number) {
  const response = await apiClient.get<ChatMessageResponse>(`chat/${id}/`);
  return response.data;
}

export async function createChatMessage(
  payload: Record<string, unknown> | FormData,
) {
  const isFormData = payload instanceof FormData;
  const response = await apiClient.post<ChatMessageResponse>("chat/", payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return response.data;
}

export async function updateChatMessage(
  id: string | number,
  payload: Record<string, unknown>,
) {
  const response = await apiClient.patch<ChatMessageResponse>(
    `chat/${id}/`,
    payload,
  );
  return response.data;
}

export async function deleteChatMessage(id: string | number) {
  const response = await apiClient.delete(`chat/${id}/`);
  return response.data;
}
