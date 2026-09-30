"use client";

import { useMemo, useState } from "react";
import { Copy, GripVertical, ListChecks, Plus, Save, Trash2 } from "lucide-react";

import type { QuestionType, Survey, SurveyQuestion } from "../../../types/course";

export interface QuizBuilderValues {
  title: string;
  description: string;
  kind: "QUIZ" | "SURVEY";
  lesson: string | null;
  is_published: boolean;
  time_limit_minutes: number | null;
  passing_score_percent: number;
  max_attempts: number | null;
  shuffle_questions: boolean;
  shuffle_choices: boolean;
  show_results: "IMMEDIATELY" | "AFTER_DEADLINE" | "NEVER";
  available_from: string | null;
  available_until: string | null;
  questions: SurveyQuestion[];
}

export function emptyQuiz(courseId: string): QuizBuilderValues {
  return {
    title: "",
    description: "",
    kind: "QUIZ",
    lesson: null,
    is_published: true,
    time_limit_minutes: null,
    passing_score_percent: 70,
    max_attempts: null,
    shuffle_questions: false,
    shuffle_choices: false,
    show_results: "IMMEDIATELY",
    available_from: null,
    available_until: null,
    questions: [],
  };
}

export function quizFromSurvey(survey: Survey): QuizBuilderValues {
  return {
    title: survey.title,
    description: survey.description,
    kind: survey.kind,
    lesson: survey.lesson,
    is_published: survey.is_published,
    time_limit_minutes: survey.time_limit_minutes,
    passing_score_percent: survey.passing_score_percent,
    max_attempts: survey.max_attempts,
    shuffle_questions: survey.shuffle_questions,
    shuffle_choices: survey.shuffle_choices,
    show_results: survey.show_results,
    available_from: survey.available_from,
    available_until: survey.available_until,
    questions: survey.questions.map((question) => ({
      ...question,
      choices: question.choices.map((choice) => ({ ...choice })),
    })),
  };
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدد",
  TRUE_FALSE: "صح / خطأ",
  SHORT_ANSWER: "إجابة قصيرة",
  MULTIPLE_SELECT: "اختيار متعدد الإجابات",
};

function newQuestion(type: QuestionType): SurveyQuestion {
  if (type === "SHORT_ANSWER") {
    return {
      text: "",
      question_type: type,
      expected_answer: "",
      expected_answers: [],
      explanation: "",
      points: 1,
      choices: [],
    };
  }
  if (type === "TRUE_FALSE") {
    return {
      text: "",
      question_type: type,
      explanation: "",
      points: 1,
      choices: [
        { text: "صح", is_correct: true },
        { text: "خطأ", is_correct: false },
      ],
    };
  }
  return {
    text: "",
    question_type: type,
    explanation: "",
    points: 1,
    choices: [
      { text: "", is_correct: type === "MULTIPLE_CHOICE" },
      { text: "", is_correct: false },
    ],
  };
}

export function validateQuiz(values: QuizBuilderValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.title.trim()) errors.title = "العنوان مطلوب.";
  if (values.questions.length === 0) {
    errors.questions = "أضف سؤالًا واحدًا على الأقل.";
  }

  values.questions.forEach((question, index) => {
    const label = `السؤال ${index + 1}`;
    if (!question.text.trim()) {
      errors[`question-${index}`] = `${label}: نص السؤال مطلوب.`;
      return;
    }
    if (question.question_type === "SHORT_ANSWER") {
      const hasExpected = Boolean(question.expected_answer?.trim()) ||
        (question.expected_answers ?? []).some((answer) => answer.trim());
      if (!hasExpected) {
        errors[`question-${index}`] = `${label}: أضف إجابة مقبولة واحدة على الأقل.`;
      }
      return;
    }
    if (question.choices.length < 2) {
      errors[`question-${index}`] = `${label}: أضف خيارين على الأقل.`;
      return;
    }
    if (question.choices.some((choice) => !choice.text.trim())) {
      errors[`question-${index}`] = `${label}: كل الخيارات تحتاج نصًا.`;
      return;
    }
    const correctCount = question.choices.filter((choice) => choice.is_correct).length;
    if (question.question_type === "MULTIPLE_SELECT") {
      if (correctCount < 1) {
        errors[`question-${index}`] = `${label}: حدّد إجابة صحيحة واحدة على الأقل.`;
      }
    } else if (correctCount !== 1) {
      errors[`question-${index}`] = `${label}: حدّد إجابة صحيحة واحدة بالضبط.`;
    }
  });

  return errors;
}

interface QuizBuilderProps {
  values: QuizBuilderValues;
  onChange: (values: QuizBuilderValues) => void;
  onSubmit: () => void;
  lessons?: Array<{ id: string; title: string }>;
  saving?: boolean;
  submitLabel?: string;
}

export default function QuizBuilder({
  values,
  onChange,
  onSubmit,
  lessons = [],
  saving = false,
  submitLabel = "حفظ",
}: QuizBuilderProps) {
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);

  const errors = useMemo(() => validateQuiz(values), [values]);
  const errorCount = Object.keys(errors).length;

  const update = (patch: Partial<QuizBuilderValues>) =>
    onChange({ ...values, ...patch });

  const updateQuestion = (index: number, patch: Partial<SurveyQuestion>) => {
    const questions = values.questions.map((question, position) =>
      position === index ? { ...question, ...patch } : question,
    );
    update({ questions });
  };

  const addQuestion = (type: QuestionType) => {
    update({ questions: [...values.questions, newQuestion(type)] });
    setOpenQuestion(values.questions.length);
  };

  const duplicateQuestion = (index: number) => {
    const source = values.questions[index];
    const copy: SurveyQuestion = {
      ...source,
      text: `${source.text} (نسخة)`,
      choices: source.choices.map((choice) => ({ ...choice })),
    };
    const questions = [...values.questions];
    questions.splice(index + 1, 0, copy);
    update({ questions });
    setOpenQuestion(index + 1);
  };

  const removeQuestion = (index: number) => {
    update({ questions: values.questions.filter((_, position) => position !== index) });
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= values.questions.length) return;
    const questions = [...values.questions];
    [questions[index], questions[target]] = [questions[target], questions[index]];
    update({ questions });
    setOpenQuestion(target);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">العنوان</label>
          <input
            value={values.title}
            onChange={(event) => update({ title: event.target.value })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
          {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">الوصف</label>
          <textarea
            value={values.description}
            onChange={(event) => update({ description: event.target.value })}
            rows={2}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>

        {lessons.length > 0 ? (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              مرتبط بدرس (اختياري)
            </label>
            <select
              value={values.lesson ?? ""}
              onChange={(event) => update({ lesson: event.target.value || null })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="">على مستوى الدورة</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">النوع</label>
          <div className="flex gap-2" role="radiogroup" aria-label="نوع النشاط">
            {(["QUIZ", "SURVEY"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={values.kind === kind}
                onClick={() => update({ kind })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  values.kind === kind
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {kind === "QUIZ" ? "اختبار مُقيَّم" : "استبيان"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">عرض النتائج</label>
          <select
            value={values.show_results}
            onChange={(event) =>
              update({ show_results: event.target.value as QuizBuilderValues["show_results"] })
            }
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          >
            <option value="IMMEDIATELY">فورًا بعد التسليم</option>
            <option value="AFTER_DEADLINE">بعد الموعد النهائي</option>
            <option value="NEVER">أبدًا</option>
          </select>
        </div>

        {values.kind === "QUIZ" ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                مدة الاختبار (دقائق، اختياري)
              </label>
              <input
                type="number"
                min={1}
                value={values.time_limit_minutes ?? ""}
                onChange={(event) =>
                  update({
                    time_limit_minutes:
                      event.target.value === "" ? null : Number(event.target.value),
                  })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                درجة النجاح (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={values.passing_score_percent}
                onChange={(event) =>
                  update({ passing_score_percent: Number(event.target.value) })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                عدد المحاولات (اتركه فارغًا لغير محدود)
              </label>
              <input
                type="number"
                min={1}
                value={values.max_attempts ?? ""}
                onChange={(event) =>
                  update({
                    max_attempts:
                      event.target.value === "" ? null : Number(event.target.value),
                  })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          </>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            متاح من (اختياري)
          </label>
          <input
            type="datetime-local"
            value={values.available_from ? values.available_from.slice(0, 16) : ""}
            onChange={(event) =>
              update({ available_from: event.target.value || null })
            }
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            متاح حتى (اختياري)
          </label>
          <input
            type="datetime-local"
            value={values.available_until ? values.available_until.slice(0, 16) : ""}
            onChange={(event) =>
              update({ available_until: event.target.value || null })
            }
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={values.shuffle_questions}
              onChange={(event) => update({ shuffle_questions: event.target.checked })}
              className="h-4 w-4 accent-orange-600"
            />
            خلط الأسئلة
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={values.shuffle_choices}
              onChange={(event) => update({ shuffle_choices: event.target.checked })}
              className="h-4 w-4 accent-orange-600"
            />
            خلط الخيارات
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={values.is_published}
              onChange={(event) => update({ is_published: event.target.checked })}
              className="h-4 w-4 accent-orange-600"
            />
            منشور
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
          <ListChecks className="h-4 w-4 text-orange-600" /> الأسئلة ({values.questions.length})
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addQuestion(type)}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-orange-100 hover:text-orange-700"
            >
              <Plus className="h-3 w-3" /> {QUESTION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {errors.questions ? (
          <p className="mb-2 text-xs text-red-600" role="alert">{errors.questions}</p>
        ) : null}

        <ul className="space-y-2">
          {values.questions.map((question, index) => {
            const open = openQuestion === index;
            const questionError = errors[`question-${index}`];
            return (
              <li
                key={index}
                className={`rounded-lg border ${questionError ? "border-red-200 bg-red-50/40" : "border-gray-100 bg-gray-50/60"}`}
              >
                <div className="flex items-center gap-2 p-2.5">
                  <GripVertical className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(open ? null : index)}
                    className="flex-1 truncate text-start text-sm font-medium text-gray-800"
                    aria-expanded={open}
                  >
                    {index + 1}. {question.text || QUESTION_TYPE_LABELS[question.question_type]}
                  </button>
                  <span className="hidden shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 ring-1 ring-gray-200 sm:inline">
                    {QUESTION_TYPE_LABELS[question.question_type]}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0}
                    className="rounded p-1 text-gray-500 transition hover:bg-gray-200 disabled:opacity-30"
                    aria-label="نقل لأعلى"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === values.questions.length - 1}
                    className="rounded p-1 text-gray-500 transition hover:bg-gray-200 disabled:opacity-30"
                    aria-label="نقل لأسفل"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateQuestion(index)}
                    className="rounded p-1 text-gray-500 transition hover:bg-gray-200"
                    aria-label="تكرار السؤال"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="rounded p-1 text-red-500 transition hover:bg-red-100"
                    aria-label="حذف السؤال"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {open ? (
                  <div className="space-y-3 border-t border-gray-100 p-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        نص السؤال
                      </label>
                      <textarea
                        value={question.text}
                        onChange={(event) => updateQuestion(index, { text: event.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">النوع</label>
                        <select
                          value={question.question_type}
                          onChange={(event) => {
                            const nextType = event.target.value as QuestionType;
                            updateQuestion(index, {
                              ...newQuestion(nextType),
                              text: question.text,
                              explanation: question.explanation,
                              points: question.points,
                            });
                          }}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                        >
                          {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => (
                            <option key={type} value={type}>
                              {QUESTION_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">النقاط</label>
                        <input
                          type="number"
                          min={1}
                          value={question.points}
                          onChange={(event) =>
                            updateQuestion(index, { points: Number(event.target.value) })
                          }
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          التوضيح (بعد التسليم)
                        </label>
                        <input
                          value={question.explanation ?? ""}
                          onChange={(event) =>
                            updateQuestion(index, { explanation: event.target.value })
                          }
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {question.question_type === "SHORT_ANSWER" ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600">
                          الإجابات المقبولة (إجابة في كل سطر)
                        </label>
                        <textarea
                          value={
                            question.expected_answer ||
                            (question.expected_answers ?? []).join("\n")
                          }
                          onChange={(event) => {
                            const lines = event.target.value.split("\n");
                            updateQuestion(index, {
                              expected_answer: lines[0] ?? "",
                              expected_answers: lines.filter((line) => line.trim()),
                            });
                          }}
                          rows={2}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600">
                          {question.question_type === "MULTIPLE_SELECT"
                            ? "حدّد إجابة صحيحة واحدة على الأقل"
                            : "حدّد الإجابة الصحيحة"}
                        </p>
                        {question.choices.map((choice, choiceIndex) => (
                          <div key={choiceIndex} className="flex items-center gap-2">
                            <input
                              type={
                                question.question_type === "MULTIPLE_SELECT"
                                  ? "checkbox"
                                  : "radio"
                              }
                              name={`correct-${index}`}
                              checked={Boolean(choice.is_correct)}
                              onChange={(event) => {
                                const choices = question.choices.map((item, position) => {
                                  if (question.question_type === "MULTIPLE_SELECT") {
                                    return position === choiceIndex
                                      ? { ...item, is_correct: event.target.checked }
                                      : item;
                                  }
                                  return {
                                    ...item,
                                    is_correct: position === choiceIndex && event.target.checked,
                                  };
                                });
                                updateQuestion(index, { choices });
                              }}
                              className="h-4 w-4 accent-orange-600"
                              aria-label={`الإجابة الصحيحة ${choiceIndex + 1}`}
                            />
                            <input
                              value={choice.text}
                              onChange={(event) => {
                                const choices = question.choices.map((item, position) =>
                                  position === choiceIndex
                                    ? { ...item, text: event.target.value }
                                    : item,
                                );
                                updateQuestion(index, { choices });
                              }}
                              placeholder={`الخيار ${choiceIndex + 1}`}
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateQuestion(index, {
                                  choices: question.choices.filter(
                                    (_, position) => position !== choiceIndex,
                                  ),
                                })
                              }
                              disabled={question.choices.length <= 2}
                              className="rounded p-1 text-red-500 transition hover:bg-red-100 disabled:opacity-30"
                              aria-label="حذف الخيار"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestion(index, {
                              choices: [
                                ...question.choices,
                                { text: "", is_correct: false },
                              ],
                            })
                          }
                          className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                          + خيار
                        </button>
                      </div>
                    )}

                    {questionError ? (
                      <p className="text-xs text-red-600" role="alert">{questionError}</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3">
        {errorCount > 0 ? (
          <p className="text-xs text-red-600" role="alert">
            {errorCount} مشكلة تحتاج إصلاحًا قبل الحفظ.
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || errorCount > 0}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "جارٍ الحفظ..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
