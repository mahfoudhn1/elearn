import {
  Course,
  Lesson,
  LessonMaterial,
  QuizStartResponse,
  Survey,
  SurveyAttempt,
  SurveySubmissionResult,
} from "../../types";
import { apiClient } from "./client";

interface CourseQuery {
  search?: string;
  teacher?: string;
}

/**
 * The backend returns a bare array for list endpoints (no pagination is
 * configured) but tolerate a `results` envelope so a future change does not
 * break the app.
 */
function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.results)) {
      return record.results as T[];
    }
  }
  return [];
}

/**
 * Courses the current student can access.
 *
 * The backend already applies the subscription rules, so this list never
 * contains a course the student is not allowed to see. `eventually` locked
 * courses are simply absent until the subscription is renewed.
 */
export async function getCourses(params: CourseQuery = {}): Promise<Course[]> {
  const response = await apiClient.get("courses/", { params });
  return normalizeList<Course>(response.data);
}

export async function getCourseById(
  courseId: string,
): Promise<Course> {
  const response = await apiClient.get(`courses/${courseId}/`);
  return response.data as Course;
}

export async function getCourseLessons(
  courseId: string,
): Promise<Lesson[]> {
  const response = await apiClient.get("courses/lessons/by_course/", {
    params: { course_id: courseId },
  });
  return normalizeList<Lesson>(response.data);
}

export async function getCourseMaterials(
  courseId: string,
): Promise<LessonMaterial[]> {
  const response = await apiClient.get("courses/materials/", {
    params: { course: courseId },
  });
  return normalizeList<LessonMaterial>(response.data);
}

export async function markLessonComplete(
  lessonId: string,
): Promise<void> {
  await apiClient.post(`courses/lessons/${lessonId}/mark_as_finished/`);
}

export async function markLessonUnfinished(
  lessonId: string,
): Promise<void> {
  await apiClient.post(`courses/lessons/${lessonId}/mark_as_unfinished/`);
}

export async function getSurveyById(
  surveyId: string,
): Promise<Survey> {
  const response = await apiClient.get(`courses/surveys/${surveyId}/`);
  return response.data as Survey;
}

export async function getCourseSurveys(
  courseId: string,
): Promise<Survey[]> {
  const response = await apiClient.get("courses/surveys/", {
    params: { course: courseId },
  });
  return normalizeList<Survey>(response.data);
}

export interface SurveyAnswerInput {
  question: string;
  choice?: string | null;
  text_answer?: string;
}

export async function submitSurvey(
  surveyId: string,
  answers: SurveyAnswerInput[],
  attempt?: string,
): Promise<SurveySubmissionResult> {
  const response = await apiClient.post(`courses/surveys/${surveyId}/submit/`, {
    attempt,
    answers,
  });
  return response.data as SurveySubmissionResult;
}

export async function startSurvey(surveyId: string): Promise<QuizStartResponse> {
  const response = await apiClient.post<QuizStartResponse>(
    `courses/surveys/${surveyId}/start/`,
  );
  return response.data;
}

export async function getSurveyAttempts(surveyId: string): Promise<SurveyAttempt[]> {
  const response = await apiClient.get(`courses/surveys/${surveyId}/attempts/`);
  return normalizeList<SurveyAttempt>(response.data);
}

/**
 * Short-lived signed URL for an uploaded lesson video.
 *
 * The `playback/` endpoint checks the subscription server-side, so a locked
 * student gets a 403 here rather than a usable URL.
 */
export async function getVideoPlaybackUrl(
  assetId: string,
): Promise<{ url: string; expires_in: number }> {
  const response = await apiClient.get<{ url: string; expires_in: number }>(
    `media/videos/${assetId}/playback/`,
  );
  return response.data;
}

/**
 * Persist the playback position. The server also marks the lesson finished
 * automatically when playback nears the end.
 */
export async function saveLessonPosition(
  lessonId: string,
  positionSeconds: number,
  isFinished?: boolean,
): Promise<{ last_position_seconds: number; is_finished: boolean }> {
  const response = await apiClient.post(`courses/lessons/${lessonId}/save_position/`, {
    position_seconds: Math.floor(positionSeconds),
    is_finished: isFinished,
  });
  return response.data;
}

/** A course is locked when the subscription lapsed after it was published. */
export function isCourseLocked(course: Course): boolean {
  return Boolean(course.access?.is_locked);
}
