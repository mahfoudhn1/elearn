"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createFlashcard,
  fetchCurriculum,
  fetchFlashcards,
  publishFlashcard,
  rejectFlashcard,
  submitFlashcard,
  type CurriculumChapter,
  type Flashcard,
  type WorkflowStatus,
} from "../../../lib/assessmentApi";
import { LatexPreview } from "../components/LatexPreview";

const STATUSES: (WorkflowStatus | "ALL")[] = ["ALL", "DRAFT", "IN_REVIEW", "PUBLISHED", "RETIRED"];

export default function FlashcardsPage() {
  const [curriculum, setCurriculum] = useState<CurriculumChapter[]>([]);
  const [status, setStatus] = useState<WorkflowStatus | "ALL">("DRAFT");
  const [rows, setRows] = useState<Flashcard[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [topicId, setTopicId] = useState("");
  const [frontAr, setFrontAr] = useState("");
  const [frontFr, setFrontFr] = useState("");
  const [backAr, setBackAr] = useState("");
  const [backFr, setBackFr] = useState("");
  const [difficulty, setDifficulty] = useState(3);

  const topics = useMemo(
    () => curriculum.flatMap((chapter) => chapter.topics),
    [curriculum],
  );

  useEffect(() => {
    fetchCurriculum()
      .then(setCurriculum)
      .catch(() => setCurriculum([]));
  }, []);

  const load = useCallback(async () => {
    try {
      setRows(await fetchFlashcards(status === "ALL" ? {} : { status }));
    } catch {
      setError("Could not load flashcards.");
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setError(null);
    setMessage(null);
    if (!topicId) {
      setError("Pick a topic first.");
      return;
    }
    setBusy(true);
    try {
      await createFlashcard({
        topic: topicId,
        front_ar: frontAr,
        front_fr: frontFr,
        back_ar: backAr,
        back_fr: backFr,
        difficulty,
      });
      setFrontAr("");
      setFrontFr("");
      setBackAr("");
      setBackFr("");
      setMessage("Flashcard created as a draft.");
      await load();
    } catch {
      setError("Could not create the flashcard.");
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: "submit" | "publish" | "reject", card: Flashcard) => {
    try {
      if (action === "submit") await submitFlashcard(card.id);
      else if (action === "publish") await publishFlashcard(card.id);
      else {
        const comment = window.prompt("Rejection comment (required):") ?? "";
        if (!comment.trim()) return;
        await rejectFlashcard(card.id, comment.trim());
      }
      await load();
    } catch {
      setError("That action is not allowed or failed.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">New flashcard</h2>
        <label className="mb-1 block text-xs text-gray-500">Topic</label>
        <select
          className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={topicId}
          onChange={(event) => setTopicId(event.target.value)}
        >
          <option value="">Select a topic…</option>
          {topics.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title_fr || item.title_ar}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs text-gray-500">Front (Arabic)</label>
        <textarea
          dir="rtl"
          rows={2}
          className="mb-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={frontAr}
          onChange={(event) => setFrontAr(event.target.value)}
        />
        <label className="mb-1 block text-xs text-gray-500">Front (French)</label>
        <textarea
          rows={2}
          className="mb-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={frontFr}
          onChange={(event) => setFrontFr(event.target.value)}
        />
        <label className="mb-1 block text-xs text-gray-500">Back (Arabic)</label>
        <textarea
          dir="rtl"
          rows={2}
          className="mb-2 w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={backAr}
          onChange={(event) => setBackAr(event.target.value)}
        />
        <label className="mb-1 block text-xs text-gray-500">Back (French)</label>
        <textarea
          rows={2}
          className="mb-3 w-full rounded-lg border border-gray-200 p-2 text-sm"
          value={backFr}
          onChange={(event) => setBackFr(event.target.value)}
        />
        <label className="mb-1 block text-xs text-gray-500">Difficulty (1–5)</label>
        <input
          type="number"
          min={1}
          max={5}
          className="mb-3 w-24 rounded-lg border border-gray-200 p-2 text-sm"
          value={difficulty}
          onChange={(event) => setDifficulty(Number(event.target.value))}
        />

        <div className="mb-3 rounded-xl bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium text-gray-500">Preview</p>
          <LatexPreview text={frontFr || frontAr || "—"} className="text-gray-800" />
          <LatexPreview text={backFr || backAr || ""} className="text-sm text-gray-600" />
        </div>

        {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mb-2 text-sm text-emerald-700">{message}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void create()}
          className="rounded-full bg-gray-800 px-5 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Create flashcard"}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          {STATUSES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={`rounded-full px-3 py-1 text-sm ${
                status === item ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((card) => (
              <li key={card.id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="mb-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {card.status}
                    </span>
                    <LatexPreview
                      text={card.front_fr || card.front_ar}
                      className="text-sm text-gray-800"
                    />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {card.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => void act("submit", card)}
                        className="rounded-full bg-gray-800 px-3 py-1 text-xs text-white"
                      >
                        Submit
                      </button>
                    ) : null}
                    {card.status === "IN_REVIEW" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void act("publish", card)}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-xs text-white"
                        >
                          Publish
                        </button>
                        <button
                          type="button"
                          onClick={() => void act("reject", card)}
                          className="rounded-full bg-red-600 px-3 py-1 text-xs text-white"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
