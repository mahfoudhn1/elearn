"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookOpen, Lock, Loader2, Search } from "lucide-react";

import axiosClientInstance from "../lib/axiosInstance";
import { fetchCatalogCourses } from "../api/courses";
import type { Course, CourseTeacher } from "../types/course";

interface TeacherOption {
  id: string;
  name: string;
}

async function fetchTeacherOptions(): Promise<TeacherOption[]> {
  const response = await axiosClientInstance.get("/teachers/", {
    params: { page_size: 100 },
  });
  const results: CourseTeacher[] = Array.isArray(response.data)
    ? response.data
    : (response.data.results ?? []);
  return results.map((teacher) => ({
    id: teacher.id,
    name: teacher.name ?? teacher.username,
  }));
}

export default function CourseCatalogPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");

  const teachersQuery = useQuery({
    queryKey: ["teacher-options"],
    queryFn: fetchTeacherOptions,
    staleTime: 5 * 60 * 1000,
  });

  const coursesQuery = useQuery({
    queryKey: ["catalog", search, teacherFilter],
    queryFn: () =>
      fetchCatalogCourses({
        search: search.trim() || undefined,
        teacher: teacherFilter || undefined,
      }),
  });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8" dir="rtl">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookOpen className="h-6 w-6 text-orange-600" /> الدورات
        </h1>
        <p className="text-sm text-gray-500">
          استعرض الدورات المتاحة من الأساتذة الذين تتابعهم.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن دورة..."
            className="w-full rounded-xl border border-gray-200 py-2.5 ps-9 pe-3 text-sm focus:border-orange-500 focus:outline-none"
            aria-label="بحث"
          />
        </label>
        <select
          value={teacherFilter}
          onChange={(event) => setTeacherFilter(event.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
          aria-label="تصفية حسب الأستاذ"
        >
          <option value="">كل الأساتذة</option>
          {(teachersQuery.data ?? []).map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
      </div>

      {coursesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" aria-label="جارٍ التحميل" />
        </div>
      ) : coursesQuery.isError ? (
        <div className="rounded-2xl bg-red-50 p-6 text-center" role="alert">
          <p className="text-red-700">تعذر تحميل الدورات.</p>
          <button
            type="button"
            onClick={() => coursesQuery.refetch()}
            className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : courses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
          لا توجد دورات مطابقة. جرّب تغيير البحث أو الفلترة.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: Course) => (
            <article
              key={course.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              {course.thumbnail ? (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-28 items-center justify-center bg-orange-50">
                  <BookOpen className="h-10 w-10 text-orange-400" />
                </div>
              )}

              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-bold text-gray-900">{course.title}</h2>
                <p className="mt-1 text-xs text-gray-500">{course.teacher_name}</p>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-gray-600">
                  {course.description}
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  {course.lessons_count} دروس • {course.surveys_count} اختبارات
                </p>

                {course.access.is_locked ? (
                  <div className="mt-4 space-y-2">
                    <p className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      <Lock className="h-3.5 w-3.5" />
                      {course.access.has_subscription
                        ? "اشتراكك غير نشط. جدّد للوصول."
                        : "يتطلب اشتراكًا للوصول."}
                    </p>
                    <Link
                      href={`/teachers/${course.teacher.id}`}
                      className="block rounded-xl bg-orange-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-orange-500"
                    >
                      اشترك الآن
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push(`/courses/${course.id}`)}
                    className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    مشاهدة الدورة
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}