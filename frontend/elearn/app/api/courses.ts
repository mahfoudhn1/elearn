import axiosClientInstance from "../lib/axiosInstance";
import type {
  Course,
  CourseSection,
  Lesson,
  LessonMaterial,
  QuizAnalytics,
  QuizStartResponse,
  QuizSubmitResponse,
  Survey,
  SurveyAttempt,
  SurveyResponse,
  TrackingOverview,
  DailyActivityRow,
  StudentCourseProgress,
  TeacherStudentProgress,
  VideoUploadInit,
  VideoUploadComplete,
} from "../types/course";

function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown[] }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export async function fetchMyCourses(): Promise<Course[]> {
  const response = await axiosClientInstance.get("/courses/");
  return unwrap<Course>(response.data);
}

export async function fetchCatalogCourses(params?: {
  search?: string;
  teacher?: string;
}): Promise<Course[]> {
  const response = await axiosClientInstance.get("/courses/", { params });
  return unwrap<Course>(response.data);
}

export async function fetchCourse(id: string): Promise<Course> {
  const response = await axiosClientInstance.get(`/courses/${id}/`);
  return response.data;
}

export interface CourseInput {
  title: string;
  description?: string;
  is_published?: boolean;
  thumbnail?: File | null;
}

function courseFormData(input: Partial<CourseInput>): FormData {
  const form = new FormData();
  if (input.title !== undefined) form.append("title", input.title);
  if (input.description !== undefined) form.append("description", input.description);
  if (input.is_published !== undefined) {
    form.append("is_published", String(input.is_published));
  }
  if (input.thumbnail) {
    form.append("thumbnail", input.thumbnail);
  }
  return form;
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const response = await axiosClientInstance.post("/courses/", courseFormData(input));
  return response.data;
}

export async function updateCourse(id: string, input: Partial<CourseInput>): Promise<Course> {
  const response = await axiosClientInstance.patch(`/courses/${id}/`, courseFormData(input));
  return response.data;
}

export async function deleteCourse(id: string): Promise<void> {
  await axiosClientInstance.delete(`/courses/${id}/`);
}

export async function reorderCourse(
  id: string,
  sectionIds: string[],
  lessonIds: string[],
): Promise<void> {
  await axiosClientInstance.post(`/courses/${id}/reorder/`, {
    sections: sectionIds,
    lessons: lessonIds,
  });
}

export interface SectionInput {
  course: string;
  title: string;
  order?: number;
}

export async function createSection(input: SectionInput): Promise<CourseSection> {
  const response = await axiosClientInstance.post("/courses/sections/", input);
  return response.data;
}

export async function updateSection(
  id: string,
  input: Partial<SectionInput>,
): Promise<CourseSection> {
  const response = await axiosClientInstance.patch(`/courses/sections/${id}/`, input);
  return response.data;
}

export async function deleteSection(id: string): Promise<void> {
  await axiosClientInstance.delete(`/courses/sections/${id}/`);
}

export interface LessonInput {
  course: string;
  section?: string | null;
  title: string;
  description?: string;
  video?: string;
  video_asset?: string | null;
  duration_seconds?: number | null;
  is_preview?: boolean;
  is_published?: boolean;
  order?: number;
}

export async function createLesson(input: LessonInput): Promise<Lesson> {
  const response = await axiosClientInstance.post("/courses/lessons/", input);
  return response.data;
}

export async function updateLesson(
  id: string,
  input: Partial<LessonInput>,
): Promise<Lesson> {
  const response = await axiosClientInstance.patch(`/courses/lessons/${id}/`, input);
  return response.data;
}

export async function deleteLesson(id: string): Promise<void> {
  await axiosClientInstance.delete(`/courses/lessons/${id}/`);
}

export async function markLessonFinished(id: string): Promise<void> {
  await axiosClientInstance.post(`/courses/lessons/${id}/mark_as_finished/`);
}

export async function markLessonUnfinished(id: string): Promise<void> {
  await axiosClientInstance.post(`/courses/lessons/${id}/mark_as_unfinished/`);
}

export async function saveLessonPosition(
  id: string,
  positionSeconds: number,
  isFinished?: boolean,
): Promise<{ last_position_seconds: number; is_finished: boolean }> {
  const response = await axiosClientInstance.post(
    `/courses/lessons/${id}/save_position/`,
    { position_seconds: Math.floor(positionSeconds), is_finished: isFinished },
  );
  return response.data;
}

export interface MaterialInput {
  course: string;
  lesson?: string | null;
  title: string;
  url?: string;
  file?: File | null;
}

export async function createMaterial(input: MaterialInput): Promise<LessonMaterial> {
  const form = new FormData();
  form.append("course", input.course);
  if (input.lesson) form.append("lesson", input.lesson);
  form.append("title", input.title);
  if (input.url) form.append("url", input.url);
  if (input.file) form.append("file", input.file);

  const response = await axiosClientInstance.post("/courses/materials/", form);
  return response.data;
}

export async function deleteMaterial(id: string): Promise<void> {
  await axiosClientInstance.delete(`/courses/materials/${id}/`);
}

export interface SurveyQuestionInput {
  text: string;
  question_type: string;
  expected_answer?: string;
  expected_answers?: string[];
  explanation?: string;
  points?: number;
  order?: number;
  choices: Array<{ text: string; is_correct: boolean; order?: number }>;
}

export interface SurveyInput {
  course: string;
  lesson?: string | null;
  title: string;
  description?: string;
  kind?: string;
  is_published?: boolean;
  time_limit_minutes?: number | null;
  passing_score_percent?: number;
  max_attempts?: number | null;
  shuffle_questions?: boolean;
  shuffle_choices?: boolean;
  show_results?: string;
  available_from?: string | null;
  available_until?: string | null;
  questions: SurveyQuestionInput[];
}

export async function createSurvey(input: SurveyInput): Promise<Survey> {
  const response = await axiosClientInstance.post("/courses/surveys/", input);
  return response.data;
}

export async function updateSurvey(
  id: string,
  input: Partial<SurveyInput>,
): Promise<Survey> {
  const response = await axiosClientInstance.patch(`/courses/surveys/${id}/`, input);
  return response.data;
}

export async function deleteSurvey(id: string): Promise<void> {
  await axiosClientInstance.delete(`/courses/surveys/${id}/`);
}

export async function fetchSurvey(id: string): Promise<Survey> {
  const response = await axiosClientInstance.get(`/courses/surveys/${id}/`);
  return response.data;
}

export async function fetchSurveyResults(id: string): Promise<SurveyResponse[]> {
  const response = await axiosClientInstance.get(`/courses/surveys/${id}/results/`);
  return unwrap<SurveyResponse>(response.data);
}

export async function fetchSurveyAnalytics(id: string): Promise<QuizAnalytics> {
  const response = await axiosClientInstance.get(`/courses/surveys/${id}/analytics/`);
  return response.data;
}

export async function fetchSurveyAttempts(id: string): Promise<SurveyAttempt[]> {
  const response = await axiosClientInstance.get(`/courses/surveys/${id}/attempts/`);
  return response.data;
}

export async function startQuiz(id: string): Promise<QuizStartResponse> {
  const response = await axiosClientInstance.post(`/courses/surveys/${id}/start/`);
  return response.data;
}

export interface AnswerPayload {
  question: string;
  choice?: string | null;
  text_answer?: string;
}

export async function submitQuiz(
  id: string,
  attempt: string,
  answers: AnswerPayload[],
): Promise<QuizSubmitResponse> {
  const response = await axiosClientInstance.post(
    `/courses/surveys/${id}/submit/`,
    { attempt, answers },
  );
  return response.data;
}

export async function fetchPlaybackUrl(assetId: string): Promise<{ url: string; expires_in: number }> {
  const response = await axiosClientInstance.get(`/media/videos/${assetId}/playback/`);
  return response.data;
}

export interface UploadPart {
  part_number: number;
  url: string;
  etag?: string;
}

export async function initVideoUpload(input: {
  filename: string;
  mime_type: string;
  size_bytes: number;
}): Promise<VideoUploadInit> {
  const response = await axiosClientInstance.post("/media/videos/init/", input);
  return response.data;
}

export async function completeVideoUpload(
  assetId: string,
  uploadId?: string,
  parts?: Array<{ part_number: number; etag: string }>,
): Promise<VideoUploadComplete> {
  const response = await axiosClientInstance.post(
    `/media/videos/${assetId}/complete/`,
    { upload_id: uploadId, parts: parts ?? [] },
  );
  return response.data;
}

export async function fetchTrackingOverview(): Promise<TrackingOverview> {
  const response = await axiosClientInstance.get("/tracking/overview/");
  return response.data;
}

export async function fetchDailyActivity(): Promise<DailyActivityRow[]> {
  const response = await axiosClientInstance.get("/tracking/daily/");
  return response.data;
}

export async function fetchStudentCoursesProgress(): Promise<StudentCourseProgress[]> {
  const response = await axiosClientInstance.get("/tracking/student/courses/");
  return response.data;
}

export async function fetchTeacherStudentsProgress(
  course?: string,
): Promise<TeacherStudentProgress[]> {
  const response = await axiosClientInstance.get("/tracking/teacher/students/", {
    params: course ? { course } : undefined,
  });
  return response.data;
}

export type { CourseSection };
