"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Activity, BookOpen, CalendarDays, Flame, Loader2, Timer, Trophy } from "lucide-react";

import {
  fetchDailyActivity,
  fetchStudentCoursesProgress,
  fetchTeacherStudentsProgress,
  fetchTrackingOverview,
} from "../api/courses";
import type { RootState } from "../../store/store";
import type { TeacherStudentProgress } from "../types/course";

export default function TrackingPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  if (user?.role === "teacher") return <TeacherTrackingView />;
  return <StudentTrackingView />;
}

function StudentTrackingView() {
  const overviewQuery = useQuery({
    queryKey: ["tracking-overview"],
    queryFn: fetchTrackingOverview,
  });
  const dailyQuery = useQuery({
    queryKey: ["tracking-daily"],
    queryFn: fetchDailyActivity,
  });
  const coursesQuery = useQuery({
    queryKey: ["tracking-student-courses"],
    queryFn: fetchStudentCoursesProgress,
  });

  if (overviewQuery.isLoading || dailyQuery.isLoading || coursesQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" aria-label="جارٍ التحميل" />
      </div>
    );
  }

  if (overviewQuery.isError || coursesQuery.isError) {
    return (
      <div className="mx-auto mt-16 max-w-xl rounded-2xl bg-red-50 p-6 text-center" dir="rtl" role="alert">
        <p className="text-red-700">تعذر تحميل بيانات المتابعة.</p>
        <button
          type="button"
          onClick={() => {
            overviewQuery.refetch();
            coursesQuery.refetch();
          }}
          className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const overview = overviewQuery.data!;
  const daily = dailyQuery.data ?? [];
  const courses = coursesQuery.data ?? [];
  const maxMinutes = Math.max(1, ...daily.map((row) => row.watch_minutes));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8" dir="rtl">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Activity className="h-6 w-6 text-orange-600" /> لوحة المتابعة
        </h1>
        <p className="text-sm text-gray-500">تقدّمك ونشاطك الدراسي.</p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Flame className="h-5 w-5" />} label="أيام متتالية" value={overview.streak_days} tone="orange" />
        <StatCard
          icon={<Timer className="h-5 w-5" />}
          label="دقائق المشاهدة"
          value={overview.video_watch_minutes}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="دروس مكتملة"
          value={overview.lessons_completed}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="اختبارات مسلّمة"
          value={overview.quizzes_submitted}
        />
      </div>

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-label="تقدم الدورات">
        <h2 className="mb-4 text-lg font-bold text-gray-900">تقدمك في الدورات</h2>
        {courses.length === 0 ? (
          <p className="text-sm text-gray-500">لم تبدأ أي دورة بعد.</p>
        ) : (
          <ul className="space-y-3">
            {courses.map((course) => (
              <li key={course.course}>
                <Link href={`/courses/${course.course}`} className="block">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">{course.title}</span>
                    <span className="text-xs text-gray-500">
                      {course.lessons_completed} / {course.lessons_total} • {course.percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: `${course.percent}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-label="النشاط اليومي">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
          <CalendarDays className="h-5 w-5 text-orange-600" /> النشاط اليومي
        </h2>
        {daily.length === 0 ? (
          <p className="text-sm text-gray-500">لا يوجد نشاط مسجّل بعد.</p>
        ) : (
          <ul className="space-y-2">
            {daily.slice(0, 14).map((row) => (
              <li key={row.date} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-xs text-gray-500">{row.date}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${(row.watch_minutes / maxMinutes) * 100}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-end text-xs text-gray-500">
                  {row.watch_minutes} د
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TeacherTrackingView() {
  const progressQuery = useQuery({
    queryKey: ["tracking-teacher-students"],
    queryFn: () => fetchTeacherStudentsProgress(),
  });

  if (progressQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" aria-label="جارٍ التحميل" />
      </div>
    );
  }

  if (progressQuery.isError) {
    return (
      <div className="mx-auto mt-16 max-w-xl rounded-2xl bg-red-50 p-6 text-center" dir="rtl" role="alert">
        <p className="text-red-700">تعذر تحميل بيانات الطلاب.</p>
        <button
          type="button"
          onClick={() => progressQuery.refetch()}
          className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const students: TeacherStudentProgress[] = progressQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8" dir="rtl">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Activity className="h-6 w-6 text-orange-600" /> تقدم الطلاب
        </h1>
        <p className="text-sm text-gray-500">متابعة إنجاز الطلاب في دوراتك.</p>
      </header>

      {students.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
          لا يوجد تقدم مسجّل بعد.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="py-2 text-start">الطالب</th>
                <th className="py-2 text-start">الإنجاز الكلي</th>
                <th className="py-2 text-start">الدورات</th>
                <th className="py-2 text-start">الاختبارات</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.student} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-800">{student.student_name}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{ width: `${student.overall_percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{student.overall_percent}%</span>
                    </div>
                  </td>
                  <td className="py-2 text-xs text-gray-600">
                    {student.courses
                      .map((course) => `${course.title}: ${course.percent}%`)
                      .join("، ")}
                  </td>
                  <td className="py-2 text-xs text-gray-600">
                    {student.quiz_attempts.length} محاولة
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "gray",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "gray" | "orange";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        tone === "orange" ? "border-orange-100 bg-orange-50" : "border-gray-100 bg-white"
      }`}
    >
      <div className={`mb-2 ${tone === "orange" ? "text-orange-600" : "text-gray-500"}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}