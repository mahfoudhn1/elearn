"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createQuestion,
  fetchCurriculum,
  fetchMisconceptions,
  updateQuestion,
  type CurriculumChapter,
  type Misconception,
  type Question,
  type QuestionKind,
  type QuestionOption,
} from "../../../lib/assessmentApi";
import { LatexPreview } from "./LatexPreview";

interface OptionDraft {
  text_ar: string;
  text_fr: string;
  is_correct: boolean;
  misconception: string;
}

const KINDS: { value: QuestionKind; label: string }[] = [
  { value: "MCQ_SINGLE", label: "Multiple choice (single)" },
  { value: "MCQ_MULTI", label: "Multiple choice (multiple)" },
  { value: "TRUE_FALSE", label: "True / False" },
  { value: "NUMERIC", label: "Numeric" },
];

function emptyOption(): OptionDraft {
  return { text_ar: "", text_fr: "", is_correct: false, misconception: "" };
}

export interface QuestionFormResult {
  question: Question;
  savedAs: "created" | "updated";
}

/**
 * Question editor: bilingual prompt/answer, LaTeX preview, option editor with a
 * misconception selector, difficulty and a topic picker. Authoring fields only;
 * the workflow (submit/publish) lives on the review queue.
 */
export function QuestionForm({
  initial,
  onSaved,
}: {
  initial?: Question;
  onSaved?: (result: QuestionFormResult) => void;
}) {
  const [curriculum, setCurriculum] = useState<CurriculumChapter[]>([]);
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [subject, setSubject] = useState("");
  const [topicId, setTopicId] = useState("");
  const [kind, setKind] = useState<QuestionKind>(initial?.kind ?? "MCQ_SINGLE");
  const [promptAr, setPromptAr] = useState(initial?.prompt_ar ?? "");
  const [promptFr, setPromptFr] = useState(initial?.prompt_fr ?? "");
  const [explanationAr, setExplanationAr] = useState(initial?.explanation_ar ?? "");
  const [explanationFr, setExplanationFr] = useState(initial?.explanation_fr ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3);
  const [options, setOptions] = useState<OptionDraft[]>(() =>
    initial?.options?.length
      ? initial.options.map((option) => ({
          text_ar: option.text_ar,
          text_fr: option.text_fr,
          is_correct: Boolean(option.is_correct),
          misconception: option.misconception ?? "",
        }))
      : [emptyOption(), emptyOption(), emptyOption()],
  );
  const [numericValue, setNumericValue] = useState("");
  const [numericTolerance, setNumericTolerance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurriculum()
      .then(setCurriculum)
      .catch(() => setCurriculum([]));
  }, []);

  useEffect(() => {
    if (!topicId) {
      setMisconceptions([]);
      return;
    }
    fetchMisconceptions(topicId)
      .then(setMisconceptions)
      .catch(() => setMisconceptions([]));
  }, [topicId]);

  const subjects = useMemo(
    () => Array.from(new Set(curriculum.map((chapter) => chapter.subject))).sort(),
    [curriculum],
  );
  const chapters = useMemo(
    () => curriculum.filter((chapter) => !subject || chapter.subject === subject),
    [curriculum, subject],
  );
  const topic = useMemo(
    () => chapters.flatMap((chapter) => chapter.topics).find((item) => item.id === topicId),
    [chapters, topicId],
  );

  const setOption = (index: number, patch: Partial<OptionDraft>) => {
    setOptions((prev) => prev.map((item, at) => (at === index ? { ...item, ...patch } : item)));
  };

  const toggleCorrect = (index: number) => {
    setOptions((prev) =>
      prev.map((item, at) => {
        if (kind === "MCQ_MULTI") {
          return at === index ? { ...item, is_correct: !item.is_correct } : item;
        }
        return { ...item, is_correct: at === index };
      }),
    );
  };

  const buildPayload = () => {
    const chapter = chapters.find((item) => item.topics.some((t) => t.id === topicId));
    const payload: Record<string, unknown> = {
      topic: topicId,
      curriculum_version: chapter?.id ? undefined : undefined,
      kind,
      prompt_ar: promptAr,
      prompt_fr: promptFr,
      explanation_ar: explanationAr,
      explanation_fr: explanationFr,
      difficulty,
    };
    if (kind === "NUMERIC") {
      payload.options = [];
      payload.numeric_spec = {
        correct_value: numericValue,
        tolerance_abs: numericTolerance || "0",
      };
    } else {
      payload.options = options
        .filter((option) => option.text_ar.trim() || option.text_fr.trim())
        .map((option, index) => ({
          text_ar: option.text_ar,
          text_fr: option.text_fr,
          is_correct: option.is_correct,
          order: index + 1,
          misconception: option.misconception || null,
        }));
    }
    return payload;
  };

  const save = async () => {
    setError(null);
    if (!topicId) {
      setError("Pick a topic first.");
      return;
    }
    setBusy(true);
    try {
      const payload = buildPayload();
      const question = initial
        ? await updateQuestion(initial.id, payload)
        : await createQuestion(payload);
      onSaved?.({ question, savedAs: initial ? "updated" : "created" });
    } catch (err) {
      const detail =
        (err as { response?: { data?: unknown } })?.response?.data ?? "Could not save.";
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Content</h2>
        <label className="mb-1 block text-xs text-gray-500">Subject</label>
        <select
          className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value);
            setTopicId("");
          }}
        >
          <option value="">All subjects</option>
          {subjects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs text-gray-500">Topic</label>
        <select
          className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={topicId}
          onChange={(event) => setTopicId(event.target.value)}
        >
          <option value="">Select a topic…</option>
          {chapters.map((chapter) => (
            <optgroup
              key={chapter.chapter}
              label={chapter.title_fr || chapter.title_ar || chapter.subject}
            >
              {chapter.topics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title_fr || item.title_ar}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <label className="mb-1 block text-xs text-gray-500">Question kind</label>
        <select
          className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={kind}
          onChange={(event) => setKind(event.target.value as QuestionKind)}
        >
          {KINDS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs text-gray-500">Prompt (Arabic)</label>
        <textarea
          dir="rtl"
          className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
          rows={3}
          value={promptAr}
          onChange={(event) => setPromptAr(event.target.value)}
        />
        <label className="mb-1 block text-xs text-gray-500">Prompt (French)</label>
        <textarea
          className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
          rows={3}
          value={promptFr}
          onChange={(event) => setPromptFr(event.target.value)}
        />

        <label className="mb-1 block text-xs text-gray-500">Explanation (Arabic)</label>
        <textarea
          dir="rtl"
          className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
          rows={2}
          value={explanationAr}
          onChange={(event) => setExplanationAr(event.target.value)}
        />
        <label className="mb-1 block text-xs text-gray-500">Explanation (French)</label>
        <textarea
          className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
          rows={2}
          value={explanationFr}
          onChange={(event) => setExplanationFr(event.target.value)}
        />

        <label className="mb-1 block text-xs text-gray-500">Difficulty (1–5)</label>
        <input
          type="number"
          min={1}
          max={5}
          className="w-24 rounded-lg border border-gray-200 p-2 text-sm"
          value={difficulty}
          onChange={(event) => setDifficulty(Number(event.target.value))}
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          {kind === "NUMERIC" ? "Answer" : "Options & misconceptions"}
        </h2>

        {kind === "NUMERIC" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Correct value</label>
              <input
                className="w-full rounded-lg border border-gray-200 p-2 text-sm"
                value={numericValue}
                onChange={(event) => setNumericValue(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Tolerance</label>
              <input
                className="w-full rounded-lg border border-gray-200 p-2 text-sm"
                value={numericTolerance}
                onChange={(event) => setNumericTolerance(event.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {options.map((option, index) => (
              <div key={index} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type={kind === "MCQ_MULTI" ? "checkbox" : "radio"}
                      checked={option.is_correct}
                      onChange={() => toggleCorrect(index)}
                    />
                    Correct
                  </label>
                  {options.length > 2 ? (
                    <button
                      type="button"
                      className="text-xs text-red-500"
                      onClick={() =>
                        setOptions((prev) => prev.filter((_item, at) => at !== index))
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <input
                  dir="rtl"
                  placeholder="نص الخيار"
                  className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
                  value={option.text_ar}
                  onChange={(event) => setOption(index, { text_ar: event.target.value })}
                />
                <input
                  placeholder="Option text"
                  className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
                  value={option.text_fr}
                  onChange={(event) => setOption(index, { text_fr: event.target.value })}
                />
                <label className="mt-2 block text-xs text-gray-500">Misconception</label>
                <select
                  className="w-full rounded-lg border border-gray-200 p-2 text-sm"
                  value={option.misconception}
                  onChange={(event) => setOption(index, { misconception: event.target.value })}
                >
                  <option value="">None</option>
                  {misconceptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button
              type="button"
              className="self-start rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
              onClick={() => setOptions((prev) => [...prev, emptyOption()])}
            >
              + Add option
            </button>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Preview</p>
          <LatexPreview text={promptAr || promptFr || "—"} className="text-gray-800" />
          <div className="mt-2 flex flex-col gap-1">
            {kind !== "NUMERIC"
              ? options
                  .filter((option) => option.text_ar.trim() || option.text_fr.trim())
                  .map((option, index) => (
                    <LatexPreview
                      key={index}
                      text={`${option.is_correct ? "✓ " : "• "}${option.text_fr || option.text_ar}`}
                      className="text-sm text-gray-700"
                    />
                  ))
              : null}
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="mt-4 rounded-full bg-gray-800 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : initial ? "Save changes" : "Create question"}
        </button>
      </div>
    </div>
  );
}
