"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, Loader2, RotateCcw, XCircle } from "lucide-react";

import {
  fetchSurvey,
  fetchSurveyAttempts,
  startQuiz,
  submitQuiz,
  type AnswerPayload,
} from "../../api/courses";
import type {
  QuizSubmitResponse,
  Survey,
  SurveyAttempt,
  SurveyQuestion,
} from "../../types/course";

interface QuizPlayerProps {
  surveyId: string;
  onFinished?: () => void;
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function QuizPlayer({ surveyId, onFinished }: QuizPlayerProps) {
  const queryClient = useQueryClient();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { choice?: string; text?: string }>>({});
  const [clock, setClock] = useState(() => Date.now());
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSubmittedRef = useRef(false);

  const surveyQuery = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: () => fetchSurvey(surveyId),
    enabled: Boolean(surveyId),
  });

  const attemptsQuery = useQuery({
    queryKey: ["survey-attempts", surveyId],
    queryFn: () => fetchSurveyAttempts(surveyId),
    enabled: Boolean(surveyId),
  });

  const survey = surveyQuery.data;

  const startMutation = useMutation({
    mutationFn: () => startQuiz(surveyId),
    onSuccess: (data) => {
      setAttemptId(data.attempt);
      setDeadline(data.deadline);
      setServerOffset(new Date(data.server_now).getTime() - Date.now());
      setAnswers({});
      setResult(null);
      setError(null);
      autoSubmittedRef.current = false;
      void queryClient.invalidateQueries({ queryKey: ["survey-attempts", surveyId] });
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "تعذر بدء الاختبار.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: ({ attempt, payload }: { attempt: string; payload: AnswerPayload[] }) =>
      submitQuiz(surveyId, attempt, payload),
    onSuccess: (data) => {
      setResult(data);
      setAttemptId(null);
      setDeadline(null);
      void queryClient.invalidateQueries({ queryKey: ["survey-attempts", surveyId] });
      void queryClient.invalidateQueries({ queryKey: ["course"] });
      onFinished?.();
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      setError(
        typeof data?.detail === "string" ? data.detail : "تعذر تسليم الإجابات.",
      );
    },
  });

  const buildPayload = useCallback(
    (source: Survey): AnswerPayload[] => {
      return source.questions.map((question) => {
        const answer = answers[question.id ?? ""] ?? {};
        if (question.question_type === "SHORT_ANSWER") {
          return { question: question.id!, text_answer: answer.text ?? "" };
        }
        return { question: question.id!, choice: answer.choice ?? null, text_answer: "" };
      });
    },
    [answers],
  );

  const handleSubmit = useCallback(() => {
    if (!attemptId || !survey) return;
    submitMutation.mutate({ attempt: attemptId, payload: buildPayload(survey) });
  }, [attemptId, survey, buildPayload, submitMutation]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = useMemo(() => {
    if (!deadline) return null;
    return Math.max(Math.floor((new Date(deadline).getTime() - (clock + serverOffset)) / 1000), 0);
  }, [deadline, clock, serverOffset]);

  useEffect(() => {
    if (secondsLeft === 0 && attemptId && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      handleSubmit();
    }
  }, [secondsLeft, attemptId, handleSubmit]);

  if (surveyQuery.isLoading) {
    return (
      <div className="flex justify-center py-10" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-orange-600" aria-label="جارٍ التحميل" />
      </div>
    );
  }

  if (surveyQuery.isError || !survey) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert" dir="rtl">
        تعذر تحميل الاختبار.
      </p>
    );
  }

  if (result) {
    const limited = result.score === null;
    return (
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" dir="rtl">
        <h3 className="text-lg font-bold text-gray-900">{survey.title}</h3>
        {limited ? (
          <p className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            <CheckCircle2 className="h-4 w-4" /> {result.message}
          </p>
        ) : (
          <>
            <p
              className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${
                result.passed ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
              }`}
            >
              {result.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              نتيجتك: {result.score} / {result.total}
              {result.percent !== undefined ? ` (${result.percent}%)` : ""}
              {result.passed ? " — ناجح" : " — لم تنجح"}
            </p>

            {result.results && survey.show_results !== "NEVER" ? (
              <ul className="space-y-2">
                {result.results.map((item, index) => {
                  const question = survey.questions.find((q) => q.id === item.question);
                  return (
                    <li
                      key={item.question}
                      className={`rounded-xl border p-3 text-sm ${
                        item.is_correct ? "border-green-100 bg-green-50/50" : "border-red-100 bg-red-50/50"
                      }`}
                    >
                      <p className="font-medium text-gray-800">
                        {index + 1}. {question?.text}
                      </p>
                      <p className={item.is_correct ? "text-green-700" : "text-red-700"}>
                        {item.is_correct ? "صحيح" : "خطأ"}
                      </p>
                      {item.explanation ? (
                        <p className="mt-1 text-xs text-gray-600">{item.explanation}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setResult(null);
            setError(null);
          }}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          <RotateCcw className="h-4 w-4" /> العودة للاختبار
        </button>
      </div>
    );
  }

  const attempts = attemptsQuery.data ?? [];
  const attemptsLeft = survey.attempts_left;
  const blocked = attemptsLeft === 0;

  if (!attemptId) {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" dir="rtl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900">{survey.title}</h3>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
            {survey.kind === "QUIZ" ? "اختبار مُقيَّم" : "استبيان"}
          </span>
        </div>
        {survey.description ? <p className="text-sm text-gray-600">{survey.description}</p> : null}
        <ul className="grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
          <li>عدد الأسئلة: {survey.questions.length}</li>
          <li>مجموع النقاط: {survey.total_points}</li>
          {survey.time_limit_minutes ? <li>المدة: {survey.time_limit_minutes} دقيقة</li> : null}
          {survey.kind === "QUIZ" ? <li>درجة النجاح: {survey.passing_score_percent}%</li> : null}
          {survey.max_attempts ? <li>المحاولات المسموحة: {survey.max_attempts}</li> : null}
          {attemptsLeft !== null && attemptsLeft !== undefined ? (
            <li>المحاولات المتبقية: {attemptsLeft}</li>
          ) : null}
        </ul>

        {error ? (
          <p className="flex items-center gap-1.5 text-sm text-red-600" role="alert">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={blocked || startMutation.isPending}
          onClick={() => startMutation.mutate()}
          className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
        >
          {blocked
            ? "لا توجد محاولات متبقية"
            : startMutation.isPending
              ? "جارٍ البدء..."
              : "ابدأ الاختبار"}
        </button>

        {attempts.length > 0 ? (
          <div>
            <h4 className="mb-2 text-sm font-bold text-gray-800">سجل المحاولات</h4>
            <ul className="space-y-1.5">
              {attempts.map((attempt: SurveyAttempt) => (
                <li
                  key={attempt.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600"
                >
                  <span>محاولة {attempt.attempt_number}</span>
                  <span>{attempt.submitted_at ? `النقطة: ${attempt.score}` : "غير مكتملة"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">{survey.title}</h3>
        {secondsLeft !== null ? (
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              secondsLeft <= 30 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"
            }`}
            aria-live="polite"
          >
            <Clock className="h-4 w-4" /> {formatSeconds(secondsLeft)}
          </span>
        ) : null}
      </div>

      <ol className="space-y-4">
        {survey.questions.map((question: SurveyQuestion, index) => (
          <li key={question.id} className="rounded-xl border border-gray-100 p-3">
            <p className="mb-2 text-sm font-medium text-gray-800">
              {index + 1}. {question.text}
              <span className="ms-2 text-xs text-gray-400">({question.points} نقطة)</span>
            </p>

            {question.question_type === "SHORT_ANSWER" ? (
              <textarea
                value={answers[question.id ?? ""]?.text ?? ""}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [question.id!]: { text: event.target.value },
                  }))
                }
                rows={2}
                aria-label={`إجابة السؤال ${index + 1}`}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />
            ) : (
              <div className="space-y-1.5">
                {question.choices.map((choice) => (
                  <label
                    key={choice.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-gray-50"
                  >
                    <input
                      type={question.question_type === "MULTIPLE_SELECT" ? "checkbox" : "radio"}
                      name={`question-${question.id}`}
                      checked={answers[question.id ?? ""]?.choice === choice.id}
                      onChange={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id!]: { choice: choice.id },
                        }))
                      }
                      className="h-4 w-4 accent-orange-600"
                    />
                    {choice.text}
                  </label>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>

      {error ? (
        <p className="flex items-center gap-1.5 text-sm text-red-600" role="alert">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={submitMutation.isPending}
        onClick={handleSubmit}
        className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-50"
      >
        {submitMutation.isPending ? "جارٍ التسليم..." : "تسليم الإجابات"}
      </button>
    </div>
  );
}