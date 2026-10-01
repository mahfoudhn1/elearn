import { apiClient } from "./client";

/**
 * @deprecated Points at `/api/schedules/`, which the backend does not route --
 * group timetables live under `/api/groups/schedules/`. Use
 * `getGroupClassSchedules` for class sessions, or `getSchedules` from
 * `./schedule` for the student's own study schedule. Kept so existing imports
 * keep resolving; no longer re-exported from the api barrel.
 */
export async function getSchedules<T = unknown>() {
  const response = await apiClient.get<T>("schedules/");
  return response.data;
}

/** Class sessions on the student's group timetable, across all their groups. */
export async function getGroupClassSchedules<T = unknown>() {
  const response = await apiClient.get<T>("groups/schedules/");
  return response.data;
}

// Fetch groups specifically joined by the logged-in student
export async function getStudentGroups<T = unknown>() {
  const response = await apiClient.get<T>("groups/student_groups/");
  return response.data;
}

// Fetch a single group's details (for the live stream status, announcements, etc.)
export async function getGroupById<T = unknown>(id: string | number) {
  const response = await apiClient.get<T>(`groups/${id}/`);
  return response.data;
}

// Student browses matching groups on a teacher's profile
export async function getProfileGroups<T = unknown>(
  teacherId: string | number,
) {
  const response = await apiClient.get<T>(`groups/profile_groups/`, {
    params: { teacher_id: teacherId },
  });
  return response.data;
}

// NOTE: If videos, quizzes, and messages live in separate Django apps (e.g., videos/ or quiz/),
// your endpoints should point directly to those base apps, filtering by group_id:
export async function getGroupVideos<T = unknown>(groupId: string | number) {
  // Update this to match your actual Django video app routing if different
  const response = await apiClient.get<T>(`videos/`, {
    params: { group_id: groupId },
  });
  return response.data;
}

export async function getGroupQuizzes<T = unknown>(groupId: string | number) {
  // Update this to match your actual Django quiz app routing if different
  const response = await apiClient.get<T>(`quiz/`, {
    params: { group_id: groupId },
  });
  return response.data;
}

// fetching schedual based on group ID
export async function getGroupSchedules<T = unknown>(groupId: string | number) {
  const response = await apiClient.get<T>(`groups/schedules/`, {
    params: { group_id: groupId },
  });
  console.log("getGroupSchedules response:", response.data);
  return response.data;
}
