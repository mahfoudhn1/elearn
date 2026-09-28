"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";

import {
  createLesson,
  createMaterial,
  createSurvey,
  deleteLesson,
  deleteMaterial,
  fetchCourse,
  fetchSurveyResults,
  updateCourse,
} from "../../../api/courses";
import type {
  Course,
  Lesson,
  QuestionType,
  Survey,
  SurveyResponse,
} from "../../../types/course";
import type { RootState } from "../../../../store/store";

type Tab = "details" | "lessons" | "materials" | "surveys";

interface DraftChoice {
  text: string;
  is_correct: boolean;
}

interface DraftQuestion {
  text: string;
  question_type: QuestionType;
  expected_answer: string;
  explanation: string;
  points: number;
  choices: DraftChoice[];
}

const emptyQuestion = (): DraftQuestion => ({
  text: "",
  question_type: "MULTIPLE_CHOICE",
  expected_answer: "",
  explanation: "",
  points: 1,
  choices: [
    { text: "", is_correct: true },
    { text: "", is_correct: false },
  ],
});

export default function ManageCoursePage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;
  const user = useSelector((state: RootState) => state.auth.user);
  const isTeacher = user?.role === "teacher";

  const [course, setCourse] = useState<Course | null>(null);
  const [tab, setTab] = useState<Tab>("details");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      setCourse(await fetchCourse(courseId));
    } catch (err: any) {
      setError(err?.response?.data?.detail || "تعذر تحميل الدورة");
    }
  }, [courseId]);

  useEffect(() => {
    if (isTeacher && courseId) void load();
  }, [isTeacher, courseId, load]);

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
    <div className="mx-auto max-w-4xl px-4 py-8" dir="rtl">
      <Link
        href="/courses/manage"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600"
      >
        <ArrowRight className="h-4 w-4" /> كل الدورات
      </Link>

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {!course ? (
        <p className="text-center text-sm text-gray-500">جارٍ التحميل...</p>
      ) : (
        <>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">
            {course.title}
          </h1>
          <p className="mb-6 text-sm text-gray-500">{course.description}</p>

          <div className="mb-6 flex flex-wrap gap-2">
            {(
              [
                ["details", "التفاصيل", FileText],
                ["lessons", "الدروس", BookOpen],
                ["materials", "المواد", FileText],
                ["surveys", "الاستبيانات", ClipboardList],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  tab === key
                    ? "bg-orange-600 text-white"
                    : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-orange-50"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {tab === "details" ? (
            <DetailsTab
              course={course}
              onSaved={setCourse}
              onError={setError}
            />
          ) : null}

          {tab === "lessons" ? (
            <LessonsTab
              course={course}
              onChanged={load}
              onError={setError}
            />
          ) : null}

          {tab === "materials" ? (
            <MaterialsTab
              course={course}
              onChanged={load}
              onError={setError}
            />
          ) : null}

          {tab === "surveys" ? (
            <SurveysTab
              course={course}
              onChanged={load}
              onError={setError}
              busy={busy}
              setBusy={setBusy}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function DetailsTab({
  course,
  onSaved,
  onError,
}: {
  course: Course;
  onSaved: (course: Course) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [isPublished, setIsPublished] = useState(course.is_published);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateCourse(course.id, {
        title,
        description,
        is_published: isPublished,
      });
      onSaved(updated);
    } catch {
      onError("تعذر حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        العنوان
      </label>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
      />

      <label className="mb-1 block text-sm font-medium text-gray-700">
        الوصف
      </label>
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={4}
        className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
      />

      <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
          className="h-4 w-4 accent-orange-600"
        />
        منشورة للطلاب
      </label>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60"
      >
        {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
      </button>
    </div>
  );
}

function LessonsTab({
  course,
  onChanged,
  onError,
}: {
  course: Course;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState("");
  const [saving, setSaving] = useState(false);

  const lessons = course.lessons ?? [];

  const addLesson = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createLesson({
        course: course.id,
        title: title.trim(),
        description: description.trim(),
        video: video.trim(),
      });
      setTitle("");
      setDescription("");
      setVideo("");
      onChanged();
    } catch {
      onError("تعذر إضافة الدرس. تأكد من صحة رابط الفيديو.");
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async (lesson: Lesson) => {
    if (!window.confirm(`حذف الدرس "${lesson.title}"؟`)) return;
    try {
      await deleteLesson(lesson.id);
      onChanged();
    } catch {
      onError("تعذر حذف الدرس");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h3 className="mb-4 leading-6 font-bold text-gray-800">إضافة درس</h3>
        <div className="grid gap-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان الدرس"
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="وصف الدرس"
            rows={2}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
          />
          <input
            value={video}
            onChange={(event) => setVideo(event.target.value)}
            placeholder="رابط الفيديو (https://...)"
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={addLesson}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> إضافة
          </button>
        </div>
      </div>

      {lessons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          لا توجد دروس بعد.
        </p>
      ) : (
        lessons.map((lesson) => (
          <div
            key={lesson.id}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
          >
            <div>
              <p className="font-semibold text-gray-900">
                {lesson.order}. {lesson.title}
              </p>
              {lesson.video ? (
                <a
                  href={lesson.video}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-orange-600"
                >
                  رابط الفيديو
                </a>
              ) : (
                <span className="text-xs text-gray-400">بدون فيديو</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeLesson(lesson)}
              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function MaterialsTab({
  course,
  onChanged,
  onError,
}: {
  course: Course;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [lessonId, setLessonId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const materials = course.materials ?? [];
  const lessons = course.lessons ?? [];

  const addMaterial = async () => {
    if (!title.trim() || (!file && !url.trim())) return;
    setSaving(true);
    try {
      await createMaterial({
        course: course.id,
        title: title.trim(),
        url: url.trim(),
        file,
        lesson: lessonId ? lessonId : null,
      });
      setTitle("");
      setUrl("");
      setFile(null);
      setLessonId("");
      onChanged();
    } catch {
      onError("تعذر إضافة المادة");
    } finally {
      setSaving(false);
    }
  };

  const removeMaterial = async (id: string) => {
    try {
      await deleteMaterial(id);
      onChanged();
    } catch {
      onError("تعذر حذف المادة");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h3 className="mb-4 font-bold text-gray-800">إضافة مادة</h3>
        <div className="grid gap-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان المادة"
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
          />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="رابط المادة (اختياري)"
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
          />
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <select
            value={lessonId}
            onChange={(event) => setLessonId(event.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
          >
            <option value="">مرتبطة بالدورة (بدون درس)</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                الدرس: {lesson.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addMaterial}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> إضافة
          </button>
        </div>
      </div>

      {materials.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          لا توجد مواد بعد.
        </p>
      ) : (
        materials.map((material) => (
          <div
            key={material.id}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
          >
            <div>
              <p className="font-semibold text-gray-900">{material.title}</p>
              <a
                href={material.file || material.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-orange-600"
              >
                فتح المادة
              </a>
            </div>
            <button
              type="button"
              onClick={() => removeMaterial(material.id)}
              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function SurveysTab({
  course,
  onChanged,
  onError,
  busy,
  setBusy,
}: {
  course: Course;
  onChanged: () => void;
  onError: (message: string) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [results, setResults] = useState<SurveyResponse[] | null>(null);
  const [resultsFor, setResultsFor] = useState<string | null>(null);

  const surveys = course.surveys ?? [];

  const patchQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) =>
      prev.map((question, i) => (i === index ? { ...question, ...patch } : question)),
    );
  };

  const patchChoice = (
    questionIndex: number,
    choiceIndex: number,
    patch: Partial<DraftChoice>,
  ) => {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              choices: question.choices.map((choice, c) =>
                c === choiceIndex ? { ...choice, ...patch } : choice,
              ),
            }
          : question,
      ),
    );
  };

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createSurvey({
        course: course.id,
        title: title.trim(),
        description: description.trim(),
        is_published: true,
        questions: questions.map((question) => ({
          text: question.text,
          question_type: question.question_type,
          expected_answer: question.expected_answer,
          explanation: question.explanation,
          points: question.points,
          choices:
            question.question_type === "SHORT_ANSWER"
              ? []
              : question.choices.map((choice) => ({
                  text: choice.text,
                  is_correct: choice.is_correct,
                })),
        })),
      });
      setTitle("");
      setDescription("");
      setQuestions([emptyQuestion()]);
      onChanged();
    } catch (err: any) {
      onError(
        err?.response?.data?.questions?.[0] ||
          err?.response?.data?.detail ||
          "تعذر إنشاء الاستبيان. تأكد من وجود إجابة صحيحة واحدة لكل سؤال.",
      );
    } finally {
      setBusy(false);
    }
  };

  const showResults = async (survey: Survey) => {
    try {
      setResultsFor(survey.id);
      setResults(await fetchSurveyResults(survey.id));
    } catch {
      onError("تعذر تحميل النتائج");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h3 className="mb-4 font-bold text-gray-800">تصميم استبيان</h3>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="عنوان الاستبيان"
          className="mb-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="وصف الاستبيان (اختياري)"
          rows={2}
          className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
        />

        <div className="space-y-4">
          {questions.map((question, questionIndex) => (
            <div
              key={questionIndex}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">
                  السؤال {questionIndex + 1}
                </span>
                {questions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((prev) => prev.filter((_, i) => i !== questionIndex))
                    }
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <input
                value={question.text}
                onChange={(event) =>
                  patchQuestion(questionIndex, { text: event.target.value })
                }
                placeholder="نص السؤال"
                className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <select
                  value={question.question_type}
                  onChange={(event) =>
                    patchQuestion(questionIndex, {
                      question_type: event.target.value as QuestionType,
                    })
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="MULTIPLE_CHOICE">اختيار من متعدد</option>
                  <option value="TRUE_FALSE">صح / خطأ</option>
                  <option value="SHORT_ANSWER">إجابة قصيرة</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={question.points}
                  onChange={(event) =>
                    patchQuestion(questionIndex, {
                      points: Number(event.target.value) || 1,
                    })
                  }
                  className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
                <span className="text-xs text-gray-500">نقاط</span>
              </div>

              {question.question_type === "SHORT_ANSWER" ? (
                <input
                  value={question.expected_answer}
                  onChange={(event) =>
                    patchQuestion(questionIndex, {
                      expected_answer: event.target.value,
                    })
                  }
                  placeholder="الإجابة الصحيحة"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              ) : (
                <div className="space-y-2">
                  {question.choices.map((choice, choiceIndex) => (
                    <div key={choiceIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={choice.is_correct}
                        onChange={() =>
                          patchQuestion(questionIndex, {
                            choices: question.choices.map((item, c) => ({
                              ...item,
                              is_correct: c === choiceIndex,
                            })),
                          })
                        }
                        className="h-4 w-4 accent-orange-600"
                      />
                      <input
                        value={choice.text}
                        onChange={(event) =>
                          patchChoice(questionIndex, choiceIndex, {
                            text: event.target.value,
                          })
                        }
                        placeholder={`الخيار ${choiceIndex + 1}`}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                      />
                      {question.choices.length > 2 ? (
                        <button
                          type="button"
                          onClick={() =>
                            patchQuestion(questionIndex, {
                              choices: question.choices.filter(
                                (_, c) => c !== choiceIndex,
                              ),
                            })
                          }
                          className="text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      patchQuestion(questionIndex, {
                        choices: [
                          ...question.choices,
                          { text: "", is_correct: false },
                        ],
                      })
                    }
                    className="text-xs font-semibold text-orange-600"
                  >
                    + إضافة خيار
                  </button>
                </div>
              )}

              <input
                value={question.explanation}
                onChange={(event) =>
                  patchQuestion(questionIndex, { explanation: event.target.value })
                }
                placeholder="شرح الإجابة (اختياري)"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            + سؤال آخر
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-xl bg-orange-600 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60"
          >
            {busy ? "جارٍ الحفظ..." : "نشر الاستبيان"}
          </button>
        </div>
      </div>

      {surveys.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          لا توجد استبيانات بعد.
        </p>
      ) : (
        surveys.map((survey) => (
          <div
            key={survey.id}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
          >
            <div>
              <p className="font-semibold text-gray-900">{survey.title}</p>
              <p className="text-xs text-gray-500">
                {survey.questions_count} أسئلة
              </p>
            </div>
            <button
              type="button"
              onClick={() => showResults(survey as Survey)}
              className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700"
            >
              النتائج
            </button>
          </div>
        ))
      )}

      {results && resultsFor ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-bold text-gray-800">نتائج الاستبيان</h4>
            <button
              type="button"
              onClick={() => {
                setResults(null);
                setResultsFor(null);
              }}
              className="text-sm text-gray-500"
            >
              إغلاق
            </button>
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد إجابات بعد.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((response) => (
                <li
                  key={response.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-2 text-sm"
                >
                  <span className="font-semibold text-gray-800">
                    {response.student_name || `طالب #${response.student}`}
                  </span>
                  <span className="text-gray-600">
                    {response.score} نقطة
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
