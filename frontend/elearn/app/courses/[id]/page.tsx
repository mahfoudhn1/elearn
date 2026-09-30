"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { fetchCourse } from "../../api/courses";
import type { Course } from "../../types/course";
import CoursePlayer from "./CoursePlayer";
import QuizPlayer from "./QuizPlayer";

export default function CourseViewerPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id ?? "";

  const courseQuery = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourse(courseId),
    enabled: Boolean(courseId),
  });

  if (courseQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" aria-label="جارٍ التحميل" />
      </div>
    );
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <div className="mx-auto mt-16 max-w-xl rounded-2xl bg-red-50 p-6 text-center" dir="rtl" role="alert">
        <p className="text-red-700">تعذر تحميل الدورة.</p>
        <button
          type="button"
          onClick={() => courseQuery.refetch()}
          className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const course = courseQuery.data as Course;
  const courseWideSurveys = (course.surveys ?? []).filter((survey) => !survey.lesson);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <CoursePlayer course={course} />

      {!course.access.is_locked && courseWideSurveys.length > 0 ? (
        <section className="mt-8 space-y-4" dir="rtl" aria-label="اختبارات الدورة">
          <h2 className="text-lg font-bold text-gray-900">اختبارات الدورة</h2>
          {courseWideSurveys.map((survey) => (
            <QuizPlayer key={survey.id} surveyId={survey.id} />
          ))}
        </section>
      ) : null}
    </div>
  );
}