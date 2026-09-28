"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BookOpen, Plus, Trash2, Eye, EyeOff } from "lucide-react";

import { createCourse, deleteCourse, fetchMyCourses } from "../../api/courses";
import type { Course } from "../../types/course";
import type { RootState } from "../../../store/store";

export default function ManageCoursesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isTeacher = user?.role === "teacher";

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCourses(await fetchMyCourses());
    } catch (err: any) {
      setError(err?.response?.data?.detail || "تعذر تحميل الدورات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isTeacher) void load();
    else setLoading(false);
  }, [isTeacher, load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await createCourse({
        title: title.trim(),
        description: description.trim(),
        is_published: isPublished,
        thumbnail,
      });
      setCourses((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setIsPublished(true);
      setThumbnail(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          JSON.stringify(err?.response?.data) ||
          "تعذر إنشاء الدورة",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("حذف هذه الدورة وكل محتواها؟")) return;
    try {
      await deleteCourse(id);
      setCourses((prev) => prev.filter((course) => course.id !== id));
    } catch {
      setError("تعذر حذف الدورة");
    }
  };

  if (!isTeacher) {
    return (
      <div className="mx-auto mt-24 max-w-xl rounded-2xl bg-white p-8 text-center shadow">
        <p className="text-lg font-semibold text-gray-800">
          هذه الصفحة متاحة للأساتذة فقط.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8" dir="rtl">
      <header className="mb-8 flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الدورات</h1>
          <p className="text-sm text-gray-500">
            انشر دوراتك، أضف الدروس والمواد، وصمّم الاستبيانات.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleCreate}
        className="mb-10 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
          <Plus className="h-5 w-5 text-orange-600" /> دورة جديدة
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              عنوان الدورة
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="مثال: الرياضيات للسنة الثالثة ثانوي"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              الوصف
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="وصف مختصر لما سيتم تدريسه"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              صورة الدورة
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setThumbnail(event.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>

          <label className="flex items-center gap-2 self-end text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
              className="h-4 w-4 accent-orange-600"
            />
            نشر الدورة مباشرة
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "إنشاء الدورة"}
        </button>
      </form>

      {loading ? (
        <p className="text-center text-sm text-gray-500">جارٍ التحميل...</p>
      ) : courses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          لم تنشر أي دورة بعد. أنشئ دورتك الأولى من النموذج أعلاه.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
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
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900">{course.title}</h3>
                  {course.is_published ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                      <Eye className="h-3 w-3" /> منشورة
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      <EyeOff className="h-3 w-3" /> مسودة
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {course.description}
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  {course.lessons_count} دروس • {course.materials_count} مواد •{" "}
                  {course.surveys_count} استبيانات
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/courses/manage/${course.id}`}
                    className="flex-1 rounded-xl bg-gray-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    إدارة المحتوى
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(course.id)}
                    className="rounded-xl border border-red-100 p-2 text-red-500 transition hover:bg-red-50"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
