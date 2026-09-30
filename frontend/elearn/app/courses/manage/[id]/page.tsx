"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  GripVertical,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Video,
} from "lucide-react";

import {
  createLesson,
  createMaterial,
  createSection,
  createSurvey,
  deleteLesson,
  deleteMaterial,
  deleteSection,
  deleteSurvey,
  fetchCourse,
  fetchSurvey,
  fetchSurveyAnalytics,
  fetchSurveyResults,
  fetchTeacherStudentsProgress,
  reorderCourse,
  updateCourse,
  updateLesson,
  updateSection,
  updateSurvey,
} from "../../../api/courses";
import type {
  Course,
  Lesson,
  LessonMaterial,
  QuizAnalytics,
  Survey,
  SurveyResponse,
} from "../../../types/course";
import VideoUploader from "../components/VideoUploader";
import QuizBuilder, {
  emptyQuiz,
  quizFromSurvey,
  type QuizBuilderValues,
} from "../components/QuizBuilder";

type Tab = "builder" | "quizzes" | "results";

function toDatetimeLocal(value: string | null): string {
  return value ? value.slice(0, 16) : "";
}

function lessonPayload(values: {
  title: string;
  description: string;
  video_asset: string | null;
  is_preview: boolean;
  is_published: boolean;
  section: string | null;
}) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    video_asset: values.video_asset,
    is_preview: values.is_preview,
    is_published: values.is_published,
    section: values.section,
  };
}

export default function CourseBuilderPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id ?? "";
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("builder");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonSection, setNewLessonSection] = useState<string>("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const courseQuery = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourse(courseId),
    enabled: Boolean(courseId),
  });

  const course = courseQuery.data;
  const sections = useMemo<Course["sections"]>(() => course?.sections ?? [], [course]);
  const allLessons = useMemo<Lesson[]>(() => course?.lessons ?? [], [course]);
  const selectedLesson = allLessons.find((lesson) => lesson.id === selectedLessonId) ?? null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["course", courseId] });
  };

  const reorderMutation = useMutation({
    mutationFn: ({ sectionIds, lessonIds }: { sectionIds: string[]; lessonIds: string[] }) =>
      reorderCourse(courseId, sectionIds, lessonIds),
    onSuccess: invalidate,
    onError: () => setError("تعذر حفظ الترتيب."),
  });

  const createSectionMutation = useMutation({
    mutationFn: (title: string) => createSection({ course: courseId, title }),
    onSuccess: () => {
      setNewSectionTitle("");
      invalidate();
    },
    onError: () => setError("تعذر إنشاء القسم."),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateSection(id, { title }),
    onSuccess: invalidate,
    onError: () => setError("تعذر تعديل القسم."),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: invalidate,
    onError: () => setError("تعذر حذف القسم."),
  });

  const createLessonMutation = useMutation({
    mutationFn: (title: string) =>
      createLesson({
        course: courseId,
        section: newLessonSection || null,
        title: title.trim(),
      }),
    onSuccess: (lesson) => {
      setNewLessonTitle("");
      setSelectedLessonId(lesson.id);
      invalidate();
    },
    onError: () => setError("تعذر إنشاء الدرس."),
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      updateLesson(id, patch),
    onSuccess: invalidate,
    onError: () => setError("تعذر حفظ الدرس."),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => {
      setSelectedLessonId(null);
      invalidate();
    },
    onError: () => setError("تعذر حذف الدرس."),
  });

  const createMaterialMutation = useMutation({
    mutationFn: (input: { lesson: string; title: string; file?: File | null; url?: string }) =>
      createMaterial({ course: courseId, lesson: input.lesson, title: input.title, file: input.file, url: input.url }),
    onSuccess: invalidate,
    onError: () => setError("تعذر إضافة المادة."),
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: invalidate,
    onError: () => setError("تعذر حذف المادة."),
  });

  const publishCourseMutation = useMutation({
    mutationFn: (isPublished: boolean) => updateCourse(courseId, { is_published: isPublished }),
    onSuccess: invalidate,
    onError: () => setError("تعذر تغيير حالة النشر."),
  });

  const handleDropLesson = (targetId: string, position: "before" | "after") => {
    if (!draggingId || draggingId === targetId || !course) return;
    const ordered = [...allLessons].sort((a, b) => a.order - b.order);
    const fromIndex = ordered.findIndex((lesson) => lesson.id === draggingId);
    const targetIndex = ordered.findIndex((lesson) => lesson.id === targetId);
    if (fromIndex === -1 || targetIndex === -1) return;
    const [moved] = ordered.splice(fromIndex, 1);
    const insertAt = ordered.findIndex((lesson) => lesson.id === targetId) + (position === "after" ? 1 : 0);
    ordered.splice(insertAt, 0, moved);
    reorderMutation.mutate({
      sectionIds: (sections ?? []).map((section) => section.id),
      lessonIds: ordered.map((lesson) => lesson.id),
    });
    setDraggingId(null);
  };

  if (courseQuery.isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" aria-label="جارٍ التحميل" />
      </div>
    );
  }

  if (courseQuery.isError || !course) {
    return (
      <div className="mx-auto mt-16 max-w-xl rounded-2xl bg-red-50 p-6 text-center text-red-700" dir="rtl" role="alert">
        تعذر تحميل الدورة.{" "}
        <button onClick={() => courseQuery.refetch()} className="font-semibold underline">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/courses/manage")}
            className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50"
            aria-label="رجوع"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-sm text-gray-500">باني الدورة: الأقسام والدروس والاختبارات</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={course.is_published}
            onChange={(event) => publishCourseMutation.mutate(event.target.checked)}
            className="h-4 w-4 accent-orange-600"
            aria-label="نشر الدورة"
          />
          الدورة منشورة
        </label>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <nav className="mb-6 flex gap-2" aria-label="أقسام باني الدورة">
        {([
          ["builder", "الأقسام والدروس", Video],
          ["quizzes", "الاختبارات", ListChecks],
          ["results", "النتائج", FileText],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === key
                ? "bg-orange-600 text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      {tab === "builder" ? (
        <BuilderTab
          course={course}
          sections={sections ?? []}
          lessons={allLessons}
          selectedLesson={selectedLesson}
          onSelectLesson={setSelectedLessonId}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          onDropLesson={handleDropLesson}
          newSectionTitle={newSectionTitle}
          setNewSectionTitle={setNewSectionTitle}
          onCreateSection={(title) => createSectionMutation.mutate(title)}
          creatingSection={createSectionMutation.isPending}
          onRenameSection={(id, title) => updateSectionMutation.mutate({ id, title })}
          onDeleteSection={(id) => deleteSectionMutation.mutate(id)}
          newLessonTitle={newLessonTitle}
          setNewLessonTitle={setNewLessonTitle}
          newLessonSection={newLessonSection}
          setNewLessonSection={setNewLessonSection}
          onCreateLesson={(title) => createLessonMutation.mutate(title)}
          creatingLesson={createLessonMutation.isPending}
          onUpdateLesson={(id, patch) => updateLessonMutation.mutate({ id, patch })}
          onDeleteLesson={(id) => deleteLessonMutation.mutate(id)}
          onCreateMaterial={(input) => createMaterialMutation.mutate(input)}
          onDeleteMaterial={(id) => deleteMaterialMutation.mutate(id)}
          savingLesson={updateLessonMutation.isPending}
        />
      ) : null}

      {tab === "quizzes" ? <QuizzesTab courseId={courseId} lessons={allLessons} /> : null}

      {tab === "results" ? <ResultsTab courseId={courseId} /> : null}
    </div>
  );
}

interface BuilderTabProps {
  course: Course;
  sections: NonNullable<Course["sections"]>;
  lessons: Lesson[];
  selectedLesson: Lesson | null;
  onSelectLesson: (id: string | null) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  onDropLesson: (targetId: string, position: "before" | "after") => void;
  newSectionTitle: string;
  setNewSectionTitle: (value: string) => void;
  onCreateSection: (title: string) => void;
  creatingSection: boolean;
  onRenameSection: (id: string, title: string) => void;
  onDeleteSection: (id: string) => void;
  newLessonTitle: string;
  setNewLessonTitle: (value: string) => void;
  newLessonSection: string;
  setNewLessonSection: (value: string) => void;
  onCreateLesson: (title: string) => void;
  creatingLesson: boolean;
  onUpdateLesson: (id: string, patch: Record<string, unknown>) => void;
  onDeleteLesson: (id: string) => void;
  onCreateMaterial: (input: { lesson: string; title: string; file?: File | null; url?: string }) => void;
  onDeleteMaterial: (id: string) => void;
  savingLesson: boolean;
}

function BuilderTab({
  sections,
  lessons,
  selectedLesson,
  onSelectLesson,
  draggingId,
  setDraggingId,
  onDropLesson,
  newSectionTitle,
  setNewSectionTitle,
  onCreateSection,
  creatingSection,
  onRenameSection,
  onDeleteSection,
  newLessonTitle,
  setNewLessonTitle,
  newLessonSection,
  setNewLessonSection,
  onCreateLesson,
  creatingLesson,
  onUpdateLesson,
  onDeleteLesson,
  onCreateMaterial,
  onDeleteMaterial,
  savingLesson,
}: BuilderTabProps) {
  const [lessonForm, setLessonForm] = useState(() => ({
    title: "",
    description: "",
    video_asset: null as string | null,
    is_preview: false,
    is_published: true,
    section: null as string | null,
  }));
  const [loadedLessonId, setLoadedLessonId] = useState<string | null>(null);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  if (selectedLesson && loadedLessonId !== selectedLesson.id) {
    setLoadedLessonId(selectedLesson.id);
    setLessonForm({
      title: selectedLesson.title,
      description: selectedLesson.description,
      video_asset: selectedLesson.video_asset,
      is_preview: selectedLesson.is_preview,
      is_published: selectedLesson.is_published,
      section: selectedLesson.section,
    });
  }
  if (!selectedLesson && loadedLessonId) {
    setLoadedLessonId(null);
  }

  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const lessonsBySection = (sectionId: string | null) =>
    lessons
      .filter((lesson) => (lesson.section ?? null) === sectionId)
      .sort((a, b) => a.order - b.order);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <section aria-label="شجرة المحتوى" className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex gap-2">
            <input
              value={newSectionTitle}
              onChange={(event) => setNewSectionTitle(event.target.value)}
              placeholder="قسم جديد"
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => newSectionTitle.trim() && onCreateSection(newSectionTitle.trim())}
              disabled={creatingSection || !newSectionTitle.trim()}
              className="flex items-center gap-1 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> قسم
            </button>
          </div>
        </div>

        {sections
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((section) => (
            <div key={section.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              {renamingSectionId === section.id ? (
                <div className="mb-2 flex gap-2">
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                    aria-label="اسم القسم"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (renameValue.trim()) onRenameSection(section.id, renameValue.trim());
                      setRenamingSectionId(null);
                    }}
                    className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-500"
                  >
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingSectionId(null)}
                    className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="flex flex-1 items-center gap-2 text-sm font-bold text-gray-800">
                    <GripVertical className="h-4 w-4 text-gray-300" aria-hidden />
                    {section.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingSectionId(section.id);
                      setRenameValue(section.title);
                    }}
                    className="rounded p-1 text-gray-500 transition hover:bg-gray-100"
                    aria-label={`تعديل ${section.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSection(section.id)}
                    className="rounded p-1 text-red-500 transition hover:bg-red-50"
                    aria-label={`حذف ${section.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <ul className="space-y-1.5">
                {lessonsBySection(section.id).map((lesson) => (
                  <li
                    key={lesson.id}
                    draggable
                    onDragStart={() => setDraggingId(lesson.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      onDropLesson(lesson.id, "before");
                    }}
                  >
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                        selectedLesson?.id === lesson.id
                          ? "border-orange-400 bg-orange-50"
                          : "border-gray-100 hover:bg-gray-50"
                      } ${draggingId === lesson.id ? "opacity-50" : ""}`}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" aria-hidden />
                      <button
                        type="button"
                        onClick={() => onSelectLesson(lesson.id)}
                        className="flex-1 truncate text-start font-medium text-gray-800"
                      >
                        {lesson.title}
                      </button>
                      {lesson.is_preview ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          معاينة
                        </span>
                      ) : null}
                      {!lesson.is_published ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                          مسودة
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onDeleteLesson(lesson.id)}
                        className="rounded p-1 text-red-500 transition hover:bg-red-50"
                        aria-label={`حذف ${lesson.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div
                      className="h-1"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        onDropLesson(lesson.id, "after");
                      }}
                      aria-hidden
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-gray-800">دروس بدون قسم</h3>
          <ul className="space-y-1.5">
            {lessonsBySection(null).map((lesson) => (
              <li
                key={lesson.id}
                draggable
                onDragStart={() => setDraggingId(lesson.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  onDropLesson(lesson.id, "before");
                }}
              >
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    selectedLesson?.id === lesson.id
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" aria-hidden />
                  <button
                    type="button"
                    onClick={() => onSelectLesson(lesson.id)}
                    className="flex-1 truncate text-start font-medium text-gray-800"
                  >
                    {lesson.title}
                  </button>
                </div>
                <div
                  className="h-1"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    onDropLesson(lesson.id, "after");
                  }}
                  aria-hidden
                />
              </li>
            ))}
            {lessonsBySection(null).length === 0 ? (
              <li className="rounded-xl border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
                لا توجد دروس بعد.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={newLessonTitle}
              onChange={(event) => setNewLessonTitle(event.target.value)}
              placeholder="عنوان الدرس الجديد"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
            <select
              value={newLessonSection}
              onChange={(event) => setNewLessonSection(event.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              aria-label="القسم"
            >
              <option value="">بدون قسم</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => newLessonTitle.trim() && onCreateLesson(newLessonTitle.trim())}
            disabled={creatingLesson || !newLessonTitle.trim()}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> إضافة درس
          </button>
        </div>
      </section>

      <section aria-label="لوحة الدرس" className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        {!selectedLesson ? (
          <p className="py-12 text-center text-sm text-gray-400">
            اختر درسًا من الشجرة لتعديله.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">العنوان</label>
              <input
                value={lessonForm.title}
                onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">الوصف</label>
              <textarea
                value={lessonForm.description}
                onChange={(event) =>
                  setLessonForm({ ...lessonForm, description: event.target.value })
                }
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={lessonForm.is_preview}
                  onChange={(event) =>
                    setLessonForm({ ...lessonForm, is_preview: event.target.checked })
                  }
                  className="h-4 w-4 accent-orange-600"
                />
                درس معاينة مجاني
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={lessonForm.is_published}
                  onChange={(event) =>
                    setLessonForm({ ...lessonForm, is_published: event.target.checked })
                  }
                  className="h-4 w-4 accent-orange-600"
                />
                منشور
              </label>
              <select
                value={lessonForm.section ?? ""}
                onChange={(event) =>
                  setLessonForm({ ...lessonForm, section: event.target.value || null })
                }
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                aria-label="قسم الدرس"
              >
                <option value="">بدون قسم</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-gray-600">فيديو الدرس</p>
              <VideoUploader
                initialAssetId={lessonForm.video_asset}
                onUploaded={(assetId) => setLessonForm({ ...lessonForm, video_asset: assetId })}
                onRemoved={() => setLessonForm({ ...lessonForm, video_asset: null })}
              />
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateLesson(selectedLesson.id, lessonPayload(lessonForm))
              }
              disabled={savingLesson}
              className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingLesson ? "جارٍ الحفظ..." : "حفظ الدرس"}
            </button>

            <div className="border-t border-gray-100 pt-4">
              <p className="mb-2 text-sm font-bold text-gray-800">مواد الدرس</p>
              <ul className="mb-3 space-y-1.5">
                {(selectedLesson.materials ?? []).map((material: LessonMaterial) => (
                  <li
                    key={material.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm"
                  >
                    <a
                      href={material.file ?? material.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 truncate text-orange-700 underline"
                    >
                      {material.title}
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteMaterial(material.id)}
                      className="rounded p-1 text-red-500 transition hover:bg-red-100"
                      aria-label={`حذف ${material.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {(selectedLesson.materials ?? []).length === 0 ? (
                  <li className="text-xs text-gray-400">لا توجد مواد.</li>
                ) : null}
              </ul>
              <div className="grid gap-2">
                <input
                  value={materialTitle}
                  onChange={(event) => setMaterialTitle(event.target.value)}
                  placeholder="عنوان المادة"
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={materialUrl}
                    onChange={(event) => setMaterialUrl(event.target.value)}
                    placeholder="أو رابط خارجي"
                    dir="ltr"
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                  <input
                    type="file"
                    onChange={(event) => setMaterialFile(event.target.files?.[0] ?? null)}
                    className="w-full text-sm"
                    aria-label="ملف المادة"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!materialTitle.trim()) return;
                    onCreateMaterial({
                      lesson: selectedLesson.id,
                      title: materialTitle.trim(),
                      file: materialFile,
                      url: materialUrl.trim() || undefined,
                    });
                    setMaterialTitle("");
                    setMaterialUrl("");
                    setMaterialFile(null);
                  }}
                  disabled={!materialTitle.trim()}
                  className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50"
                >
                  إضافة مادة
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function QuizzesTab({ courseId, lessons }: { courseId: string; lessons: Lesson[] }) {
  const queryClient = useQueryClient();
  const courseQuery = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourse(courseId),
  });
  const surveys = courseQuery.data?.surveys ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<QuizBuilderValues>(() => emptyQuiz(courseId));
  const [error, setError] = useState("");

  const surveyQuery = useQuery({
    queryKey: ["survey", editingId],
    queryFn: () => fetchSurvey(editingId!),
    enabled: Boolean(editingId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["course", courseId] });
    void queryClient.invalidateQueries({ queryKey: ["survey", editingId] });
  };

  const createMutation = useMutation({
    mutationFn: (input: QuizBuilderValues) =>
      createSurvey({
        course: courseId,
        lesson: input.lesson,
        title: input.title.trim(),
        description: input.description,
        kind: input.kind,
        is_published: input.is_published,
        time_limit_minutes: input.time_limit_minutes,
        passing_score_percent: input.passing_score_percent,
        max_attempts: input.max_attempts,
        shuffle_questions: input.shuffle_questions,
        shuffle_choices: input.shuffle_choices,
        show_results: input.show_results,
        available_from: input.available_from,
        available_until: input.available_until,
        questions: input.questions.map((question, index) => ({
          text: question.text,
          question_type: question.question_type,
          expected_answer: question.expected_answer,
          expected_answers: question.expected_answers,
          explanation: question.explanation,
          points: question.points,
          order: index + 1,
          choices: question.choices.map((choice, choiceIndex) => ({
            text: choice.text,
            is_correct: Boolean(choice.is_correct),
            order: choiceIndex + 1,
          })),
        })),
      }),
    onSuccess: () => {
      setCreating(false);
      setValues(emptyQuiz(courseId));
      invalidate();
    },
    onError: () => setError("تعذر حفظ الاختبار."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: QuizBuilderValues }) =>
      updateSurvey(id, {
        title: input.title.trim(),
        description: input.description,
        kind: input.kind,
        lesson: input.lesson,
        is_published: input.is_published,
        time_limit_minutes: input.time_limit_minutes,
        passing_score_percent: input.passing_score_percent,
        max_attempts: input.max_attempts,
        shuffle_questions: input.shuffle_questions,
        shuffle_choices: input.shuffle_choices,
        show_results: input.show_results,
        available_from: input.available_from,
        available_until: input.available_until,
        questions: input.questions.map((question, index) => ({
          text: question.text,
          question_type: question.question_type,
          expected_answer: question.expected_answer,
          expected_answers: question.expected_answers,
          explanation: question.explanation,
          points: question.points,
          order: index + 1,
          choices: question.choices.map((choice, choiceIndex) => ({
            text: choice.text,
            is_correct: Boolean(choice.is_correct),
            order: choiceIndex + 1,
          })),
        })),
      }),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: () => setError("تعذر حفظ الاختبار."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: invalidate,
    onError: () => setError("تعذر حذف الاختبار."),
  });

  if (creating) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" dir="rtl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">اختبار جديد</h2>
        {error ? <p className="mb-3 text-sm text-red-600" role="alert">{error}</p> : null}
        <QuizBuilder
          values={values}
          onChange={setValues}
          onSubmit={() => createMutation.mutate(values)}
          lessons={lessons}
          saving={createMutation.isPending}
          submitLabel="إنشاء الاختبار"
        />
      </div>
    );
  }

  if (editingId) {
    if (surveyQuery.isLoading) {
      return (
        <div className="flex justify-center py-16" dir="rtl">
          <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        </div>
      );
    }
    const survey = surveyQuery.data;
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" dir="rtl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          تعديل: {survey?.title ?? "اختبار"}
        </h2>
        {error ? <p className="mb-3 text-sm text-red-600" role="alert">{error}</p> : null}
        {survey ? (
          <QuizBuilder
            values={quizFromSurvey(survey)}
            onChange={setValues}
            onSubmit={() => updateMutation.mutate({ id: editingId, input: values })}
            lessons={lessons}
            saving={updateMutation.isPending}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      <button
        type="button"
        onClick={() => {
          setValues(emptyQuiz(courseId));
          setCreating(true);
        }}
        className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
      >
        <Plus className="h-4 w-4" /> اختبار جديد
      </button>

      {surveys.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          لم تنشئ أي اختبارات بعد.
        </p>
      ) : (
        <ul className="space-y-2">
          {surveys.map((survey) => (
            <li
              key={survey.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{survey.title}</p>
                <p className="text-xs text-gray-500">
                  {survey.kind === "QUIZ" ? "اختبار مُقيَّم" : "استبيان"} •{" "}
                  {survey.questions_count} أسئلة
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(survey.id)}
                className="rounded-xl bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-gray-700"
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(survey.id)}
                className="rounded-xl border border-red-100 p-2 text-red-500 transition hover:bg-red-50"
                aria-label={`حذف ${survey.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ResultsTab({ courseId }: { courseId: string }) {
  const courseQuery = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => fetchCourse(courseId),
  });
  const surveys = courseQuery.data?.surveys ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const resultsQuery = useQuery({
    queryKey: ["survey-results", selectedId],
    queryFn: () => fetchSurveyResults(selectedId!),
    enabled: Boolean(selectedId),
  });

  const analyticsQuery = useQuery({
    queryKey: ["survey-analytics", selectedId],
    queryFn: () => fetchSurveyAnalytics(selectedId!),
    enabled: Boolean(selectedId),
  });

  const progressQuery = useQuery({
    queryKey: ["teacher-students-progress", courseId],
    queryFn: () => fetchTeacherStudentsProgress(courseId),
  });

  const exportResultsCsv = (surveyTitle: string, responses: SurveyResponse[]) => {
    const header = ["الطالب", "النقطة", "وقت التسليم"];
    const rows = responses.map((response) => [
      response.student_name ?? response.student,
      String(response.score),
      response.submitted_at,
    ]);
    downloadCsv(`results-${surveyTitle}.csv`, [header, ...rows]);
  };

  const exportProgressCsv = (rows: { student_name: string; overall_percent: number; courses: { title: string; percent: number }[] }[]) => {
    const header = ["الطالب", "نسبة الإنجاز الكلية", "تفاصيل الدورات"];
    const body = rows.map((row) => [
      row.student_name,
      `${row.overall_percent}%`,
      row.courses.map((course) => `${course.title}: ${course.percent}%`).join(" | "),
    ]);
    downloadCsv("student-progress.csv", [header, ...body]);
  };

  const selectedSurvey = surveys.find((survey) => survey.id === selectedId);

  return (
    <div className="space-y-6" dir="rtl">
      <section aria-label="تحليلات الاختبارات" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">تحليلات الاختبارات</h2>
        {surveys.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد اختبارات في هذه الدورة.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {surveys.map((survey) => (
                <button
                  key={survey.id}
                  type="button"
                  onClick={() => setSelectedId(survey.id === selectedId ? null : survey.id)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                    selectedId === survey.id
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {survey.title}
                </button>
              ))}
            </div>

            {selectedId && analyticsQuery.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
            ) : null}

            {selectedId && analyticsQuery.data ? (
              <AnalyticsView analytics={analyticsQuery.data} />
            ) : null}

            {selectedId && resultsQuery.data ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">
                    إجابات الطلاب ({resultsQuery.data.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      selectedSurvey &&
                      exportResultsCsv(selectedSurvey.title, resultsQuery.data)
                    }
                    className="rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700"
                  >
                    تصدير CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-500">
                        <th className="py-2 text-start">الطالب</th>
                        <th className="py-2 text-start">النقطة</th>
                        <th className="py-2 text-start">وقت التسليم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultsQuery.data.map((response) => (
                        <tr key={response.id} className="border-b border-gray-50">
                          <td className="py-2">{response.student_name ?? response.student}</td>
                          <td className="py-2">{response.score}</td>
                          <td className="py-2 text-xs text-gray-500">
                            {new Date(response.submitted_at).toLocaleString("ar")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section aria-label="تقدم الطلاب" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">تقدم الطلاب</h2>
          {progressQuery.data && progressQuery.data.length > 0 ? (
            <button
              type="button"
              onClick={() => exportProgressCsv(progressQuery.data ?? [])}
              className="rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700"
            >
              تصدير CSV
            </button>
          ) : null}
        </div>

        {progressQuery.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
        ) : (progressQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">لا يوجد تقدم مسجّل بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="py-2 text-start">الطالب</th>
                  <th className="py-2 text-start">الإنجاز الكلي</th>
                  <th className="py-2 text-start">الدورات</th>
                </tr>
              </thead>
              <tbody>
                {(progressQuery.data ?? []).map((student) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function AnalyticsView({ analytics }: { analytics: QuizAnalytics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="محاولات بدأت" value={analytics.attempts_started} />
      <Stat label="محاولات سلّمت" value={analytics.attempts_submitted} />
      <Stat
        label="متوسط النسبة"
        value={analytics.average_percent === null ? "—" : `${analytics.average_percent}%`}
      />
      <Stat
        label="نسبة النجاح"
        value={analytics.pass_rate === null ? "—" : `${analytics.pass_rate}%`}
      />
      <Stat label="عدد الطلاب" value={analytics.distinct_students} />
      <Stat label="مجموع النقاط" value={analytics.total_points} />

      <div className="sm:col-span-3 mt-2 space-y-2">
        {analytics.questions.map((question) => (
          <div key={question.question} className="rounded-xl bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-800">{question.text}</p>
            <p className="mt-1 text-xs text-gray-500">
              إجابات: {question.total_answers} • صحيحة: {question.correct_answers} (
              {question.correct_rate === null ? "—" : `${question.correct_rate}%`})
            </p>
            {question.choice_counts.length > 0 ? (
              <ul className="mt-1.5 space-y-1">
                {question.choice_counts.map((choice) => (
                  <li key={choice.choice} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-24 truncate">{choice.text}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${
                            question.total_answers
                              ? (choice.count / question.total_answers) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span>{choice.count}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
