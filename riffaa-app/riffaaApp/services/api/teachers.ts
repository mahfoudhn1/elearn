import { apiClient } from "./client";

// Fetch all available teachers (with optional search/subject filtering)
export async function getTeachers<T = unknown>(params?: {
  search?: string;
  subject_id?: string | number;
  page?: number;
  /** Backend enum: `PRIMARY` | `MIDDLE` | `SECONDARY`. */
  teaching_level?: string;
  wilaya?: string;
}) {
  const response = await apiClient.get<T>("teachers/", { params });
  return response.data;
}

// Fetch featured or top-rated teachers for the Home/Explore screen
export async function getFeaturedTeachers<T = unknown>() {
  const response = await apiClient.get<T>("teachers/featured/");
  return response.data;
}

// Fetch a single teacher's full profile details (bio, avatar, stats)
export async function getTeacherById<T = unknown>(id: string | number) {
  const response = await apiClient.get<T>(`teachers/${id}/`);
  return response.data;
}

// Fetch list of teachers that the logged-in student is subscribed/following
export async function getSubscribedTeachers<T = unknown>() {
  const response = await apiClient.get<T>("teachers/subscribed/");
  return response.data;
}

// Subscribe/Follow a teacher
export async function subscribeToTeacher<T = unknown>(
  teacherId: string | number,
) {
  const response = await apiClient.post<T>(`teachers/${teacherId}/subscribe/`);
  return response.data;
}

// Unsubscribe/Unfollow a teacher
export async function unsubscribeFromTeacher<T = unknown>(
  teacherId: string | number,
) {
  const response = await apiClient.post<T>(
    `teachers/${teacherId}/unsubscribe/`,
  );
  return response.data;
}
