"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  PlayCircle,
} from "lucide-react";

import { fetchPlaybackUrl, saveLessonPosition } from "../../api/courses";
import type { Course, Lesson, LessonMaterial } from "../../types/course";
import QuizPlayer from "./QuizPlayer";

interface CoursePlayerProps {
  course: Course;
}

function orderedLessons(course: Course): Lesson[] {
  return [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
}

export default function CoursePlayer({ course }: CoursePlayerProps) {
  const lessons = useMemo(() => orderedLessons(course), [course]);
  const lessonGroups = useMemo(() => {
    const sections = [...(course.sections ?? [])].sort((a, b) => a.order - b.order);
    const groups: Array<{ id: string; title: string | null; lessons: Lesson[] }> = [];

    for (const section of sections) {
      const sectionLessons = lessons.filter(
        (lesson) => lesson.section && lesson.section === section.id,
      );
      if (sectionLessons.length > 0) {
        groups.push({ id: section.id, title: section.title, lessons: sectionLessons });
      }
    }

    const loose = lessons.filter((lesson) => !lesson.section);
    if (loose.length > 0) groups.push({ id: "__unassigned__", title: null, lessons: loose });
    if (groups.length === 0 && lessons.length > 0) {
      groups.push({ id: "__all__", title: null, lessons });
    }
    return groups;
  }, [course.sections, lessons]);

  const firstIncomplete = lessons.find((lesson) => !lesson.is_finished);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    firstIncomplete?.id ?? lessons[0]?.id ?? null,
  );
  const [finishedIds, setFinishedIds] = useState<Set<string>>(
    () => new Set(lessons.filter((lesson) => lesson.is_finished).map((lesson) => lesson.id)),
  );
  const [resumeAt, setResumeAt] = useState<Record<string, number>>(() =>
    Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson.last_position_seconds])),
  );
  const [duration, setDuration] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      lessons
        .filter((lesson) => lesson.duration_seconds)
        .map((lesson) => [lesson.id, lesson.duration_seconds as number]),
    ),
  );
  const [reported, setReported] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? null;

  const playbackQuery = useQuery({
    queryKey: ["playback", activeLesson?.video_asset],
    queryFn: () => fetchPlaybackUrl(activeLesson!.video_asset!),
    enabled: Boolean(activeLesson?.video_asset),
    staleTime: 25 * 60 * 1000,
  });

  const percent = lessons.length
    ? Math.round((finishedIds.size / lessons.length) * 100)
    : 0;

  const activeIndex = activeLesson
    ? lessons.findIndex((lesson) => lesson.id === activeLesson.id)
    : -1;
  const prevLesson = activeIndex > 0 ? lessons[activeIndex - 1] : null;
  const nextLesson =
    activeIndex >= 0 && activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;

  const persistPosition = useCallback(
    async (lesson: Lesson, seconds: number, isFinished?: boolean) => {
      try {
        const response = await saveLessonPosition(lesson.id, seconds, isFinished);
        setResumeAt((prev) => ({ ...prev, [lesson.id]: response.last_position_seconds }));
        if (response.is_finished) {
          setFinishedIds((prev) => new Set(prev).add(lesson.id));
        }
      } catch {
        /* progress reporting is best-effort */
      }
    },
    [],
  );

  useEffect(() => {
    setReported(0);
  }, [activeLessonId]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !activeLesson) return;
    const current = Math.floor(video.currentTime);
    if (current - reported >= 15) {
      setReported(current);
      void persistPosition(activeLesson, current);
    }
  };

  const handlePauseOrEnd = (ended: boolean) => {
    const video = videoRef.current;
    if (!video || !activeLesson) return;
    const current = ended
      ? Math.floor(duration[activeLesson.id] ?? video.currentTime)
      : Math.floor(video.currentTime);
    setReported(current);
    void persistPosition(activeLesson, current, ended || undefined);
    if (ended) setFinishedIds((prev) => new Set(prev).add(activeLesson.id));
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !activeLesson) return;
    setDuration((prev) => ({ ...prev, [activeLesson.id]: Math.floor(video.duration || 0) }));
    const resume = resumeAt[activeLesson.id] ?? 0;
    if (resume > 0 && resume < (video.duration || Infinity) - 2) {
      video.currentTime = resume;
    }
  };

  const selectLesson = (lessonId: string) => {
    const video = videoRef.current;
    if (video && activeLesson && activeLesson.id !== lessonId) {
      void persistPosition(activeLesson, Math.floor(video.currentTime));
    }
    setActiveLessonId(lessonId);
  };

  const markFinished = () => {
    if (!activeLesson) return;
    const video = videoRef.current;
    const position = video
      ? Math.floor(video.currentTime)
      : (duration[activeLesson.id] ?? 0);
    void persistPosition(activeLesson, position, true);
    setFinishedIds((prev) => new Set(prev).add(activeLesson.id));
  };

  if (course.access.is_locked) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow" dir="rtl">
        <p className="text-lg font-semibold text-gray-800">
          هذه الدورة مقفلة. اشترك مع الأستاذ للوصول إلى محتواها.
        </p>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow" dir="rtl">
        <p className="text-sm text-gray-500">لا توجد دروس في هذه الدورة بعد.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]" dir="rtl">
      <main>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-gray-900">{course.title}</h1>
          <p className="mb-3 text-sm text-gray-500">
            {course.teacher_name} • {finishedIds.size} / {lessons.length} مكتمل
          </p>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${percent}%` }}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          {activeLesson ? (
            <>
              <h2 className="mb-2 font-semibold text-gray-800">{activeLesson.title}</h2>
              {activeLesson.description ? (
                <p className="mb-3 text-sm text-gray-600">{activeLesson.description}</p>
              ) : null}

              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                {activeLesson.video_asset ? (
                  playbackQuery.isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" aria-label="جارٍ التحميل" />
                    </div>
                  ) : playbackQuery.data ? (
                    <video
                      ref={videoRef}
                      key={activeLesson.id}
                      src={playbackQuery.data.url}
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      onPause={() => handlePauseOrEnd(false)}
                      onEnded={() => handlePauseOrEnd(true)}
                      onLoadedMetadata={handleLoadedMetadata}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white">
                      تعذر تحميل الفيديو.
                    </div>
                  )
                ) : activeLesson.video ? (
                  <video
                    ref={videoRef}
                    key={activeLesson.id}
                    src={activeLesson.video}
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    onPause={() => handlePauseOrEnd(false)}
                    onEnded={() => handlePauseOrEnd(true)}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                    <PlayCircle className="h-8 w-8" />
                    <span className="text-sm">لا يوجد فيديو لهذا الدرس.</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={markFinished}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    finishedIds.has(activeLesson.id)
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-900 text-white hover:bg-gray-700"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {finishedIds.has(activeLesson.id) ? "أُنجز" : "تحديد كمكتمل"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!prevLesson}
                    onClick={() => prevLesson && selectLesson(prevLesson.id)}
                    className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" /> السابق
                  </button>
                  <button
                    type="button"
                    disabled={!nextLesson}
                    onClick={() => nextLesson && selectLesson(nextLesson.id)}
                    className="flex items-center gap-1 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-40"
                  >
                    الدرس التالي <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {(activeLesson.materials ?? []).length > 0 ? (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-800">
                    <FileText className="h-4 w-4" /> مواد الدرس
                  </h3>
                  <ul className="space-y-1.5">
                    {(activeLesson.materials ?? []).map((material: LessonMaterial) => (
                      <li key={material.id}>
                        <a
                          href={material.file ?? material.url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-orange-700 transition hover:bg-orange-50"
                        >
                          <Download className="h-3.5 w-3.5" /> {material.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(course.surveys ?? []).some((survey) => survey.lesson === activeLesson.id) ? (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h3 className="mb-2 text-sm font-bold text-gray-800">اختبارات الدرس</h3>
                  {(course.surveys ?? [])
                    .filter((survey) => survey.lesson === activeLesson.id)
                    .map((survey) => (
                      <QuizPlayer key={survey.id} surveyId={survey.id} />
                    ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {(course.materials ?? []).length > 0 ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-800">
              <FileText className="h-4 w-4" /> مواد الدورة
            </h3>
            <ul className="space-y-1.5">
              {(course.materials ?? []).map((material: LessonMaterial) => (
                <li key={material.id}>
                  <a
                    href={material.file ?? material.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-orange-700 transition hover:bg-orange-50"
                  >
                    <Download className="h-3.5 w-3.5" /> {material.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>

      <aside className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-800">
          <BookOpen className="h-4 w-4" /> محتوى الدورة
        </h3>
        <div className="space-y-3">
          {lessonGroups.map((group) => (
            <div key={group.id}>
              {group.title ? (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {group.title}
                </p>
              ) : null}
              <ul className="space-y-1">
                {group.lessons.map((lesson) => {
                  const done = finishedIds.has(lesson.id);
                  const position = lessons.findIndex((item) => item.id === lesson.id);
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => selectLesson(lesson.id)}
                        aria-current={activeLesson?.id === lesson.id ? "true" : undefined}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm transition ${
                          activeLesson?.id === lesson.id
                            ? "bg-orange-50 text-orange-800"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                            done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {done ? <Check className="h-3 w-3" /> : position + 1}
                        </span>
                        <span className="flex-1 truncate">{lesson.title}</span>
                        {lesson.is_preview ? (
                          <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            معاينة
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}