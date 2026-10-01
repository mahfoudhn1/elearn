import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCourseById,
  getCourseLessons,
  getCourseMaterials,
  getCourses,
  getSurveyAttempts,
  getSurveyById,
  getVideoPlaybackUrl,
  markLessonComplete,
  markLessonUnfinished,
  saveLessonPosition,
  startSurvey,
  type SurveyAnswerInput,
  submitSurvey,
} from "../services/api";

const FIVE_MINUTES = 1000 * 60 * 5;

export function useCourses(params: { search?: string } = {}) {
  return useQuery({
    queryKey: ["courses", params],
    queryFn: () => getCourses(params),
    staleTime: FIVE_MINUTES,
  });
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course", String(courseId)],
    queryFn: () => getCourseById(courseId as string),
    enabled: Boolean(courseId),
    staleTime: FIVE_MINUTES,
  });
}

export function useCourseLessons(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course-lessons", String(courseId)],
    queryFn: () => getCourseLessons(courseId as string),
    enabled: Boolean(courseId),
    staleTime: FIVE_MINUTES,
  });
}

export function useCourseMaterials(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course-materials", String(courseId)],
    queryFn: () => getCourseMaterials(courseId as string),
    enabled: Boolean(courseId),
    staleTime: FIVE_MINUTES,
  });
}

export function useSurvey(surveyId: string | undefined) {
  return useQuery({
    queryKey: ["survey", String(surveyId)],
    queryFn: () => getSurveyById(surveyId as string),
    enabled: Boolean(surveyId),
    staleTime: FIVE_MINUTES,
  });
}

export function useLessonProgressMutation(courseId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["course", String(courseId)] });
    queryClient.invalidateQueries({
      queryKey: ["course-lessons", String(courseId)],
    });
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  const complete = useMutation({
    mutationFn: (lessonId: string) => markLessonComplete(lessonId),
    onSuccess: invalidate,
  });

  const uncomplete = useMutation({
    mutationFn: (lessonId: string) => markLessonUnfinished(lessonId),
    onSuccess: invalidate,
  });

  return { complete, uncomplete };
}

export function useSubmitSurveyMutation(
  surveyId: string | undefined,
  courseId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      answers,
      attempt,
    }: {
      answers: SurveyAnswerInput[];
      attempt?: string;
    }) => submitSurvey(surveyId as string, answers, attempt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", String(surveyId)] });
      queryClient.invalidateQueries({ queryKey: ["survey-attempts", String(surveyId)] });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ["course", String(courseId)] });
      }
    },
  });
}

export function useSurveyAttempts(surveyId: string | undefined) {
  return useQuery({
    queryKey: ["survey-attempts", String(surveyId)],
    queryFn: () => getSurveyAttempts(surveyId as string),
    enabled: Boolean(surveyId),
    staleTime: FIVE_MINUTES,
  });
}

export function useStartSurveyMutation(surveyId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => startSurvey(surveyId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", String(surveyId)] });
    },
  });
}

export function useLessonPlayback(assetId: string | null | undefined) {
  return useQuery({
    queryKey: ["playback", String(assetId)],
    queryFn: () => getVideoPlaybackUrl(assetId as string),
    enabled: Boolean(assetId),
    staleTime: 1000 * 60 * 20,
  });
}

export function useLessonPositionMutation(courseId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonId,
      positionSeconds,
      isFinished,
    }: {
      lessonId: string;
      positionSeconds: number;
      isFinished?: boolean;
    }) => saveLessonPosition(lessonId, positionSeconds, isFinished),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course", String(courseId)] });
    },
  });
}
