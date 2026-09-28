import axiosClientInstance from "../lib/axiosInstance";
import type { Course, Lesson, LessonMaterial, Survey, SurveyResponse } from "../types/course";

function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as any).results)) {
    return (payload as any).results as T[];
  }
  return [];
}

export async function fetchMyCourses(): Promise<Course[]> {
  const response = await axiosClientInstance.get("/courses/");
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

function courseFormData(input: CourseInput): FormData {
  const form = new FormData();
  form.append("title", input.title);
  form.append("description", input.description ?? "");
  form.append("is_published", String(input.is_published ?? true));
  if (input.thumbnail) {
    form.append("thumbnail", input.thumbnail);
  }
  return form;
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const response = await axiosClientInstance.post("/courses/", courseFormData(input));
  return response.data;
}

export async function updateCourse(id: string, input: CourseInput): Promise<Course> {
  const response = await axiosClientInstance.patch(`/courses/${id}/`, courseFormData(input));
  return response.data;
}

export async function deleteCourse(id: string): Promise<void> {
  await axiosClientInstance.delete(`/courses/${id}/`);
}

export interface LessonInput {
  course: string;
  title: string;
  description?: string;
  video?: string;
  order?: number;
}

export async function createLesson(input: LessonInput): Promise<Lesson> {
  const response = await axiosClientInstance.post("/courses/lessons/", input);
  return response.data;
}

export async function updateLesson(id: string, input: Partial<LessonInput>): Promise<Lesson> {
  const response = await axiosClientInstance.patch(`/courses/lessons/${id}/`, input);
  return response.data;
}

export async function deleteLesson(id: string): Promise<void> {
  await axiosClientInstance.delete(`/courses/lessons/${id}/`);
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
  form.append("course", String(input.course));
  if (input.lesson) form.append("lesson", String(input.lesson));
  form.append("title", input.title);
  if (input.url) form.append("url", input.url);
  if (input.file) form.append("file", input.file);

  const response = await axiosClientInstance.post("/courses/materials/", form);
  return response.data;
}

export async function deleteMaterial(id: string): Promise<void> {
  await axiosClientInstance.delete(`/courses/materials/${id}/`);
}

export interface SurveyInput {
  course: string;
  lesson?: string | null;
  title: string;
  description?: string;
  is_published?: boolean;
  questions: Array<{
    text: string;
    question_type: string;
    expected_answer?: string;
    explanation?: string;
    points?: number;
    order?: number;
    choices: Array<{ text: string; is_correct: boolean; order?: number }>;
  }>;
}

export async function createSurvey(input: SurveyInput): Promise<Survey> {
  const response = await axiosClientInstance.post("/courses/surveys/", input);
  return response.data;
}

export async function fetchSurvey(id: string): Promise<Survey> {
  const response = await axiosClientInstance.get(`/courses/surveys/${id}/`);
  return response.data;
}

export async function fetchSurveyResults(id: string): Promise<SurveyResponse[]> {
  const response = await axiosClientInstance.get(`/courses/surveys/${id}/results/`);
  return unwrap<SurveyResponse>(response.data);
}
