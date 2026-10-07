"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchQuestions,
  publishQuestion,
  rejectQuestion,
  submitQuestion,
  type Question,
  type WorkflowStatus,
} from "../../lib/assessmentApi";
import { LatexPreview } from "./components/LatexPreview";

const STATUSES: (WorkflowStatus | "ALL")[] = [
  "ALL",
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
  "RETIRED",
];

const STATUS_STYLE: Record<WorkflowStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  RETIRED: "bg-red-100 text-red-700",
};

export default function ReviewQueuePage() {
  const [status, setStatus] = useState<WorkflowStatus | "ALL">("IN_REVIEW");
  const [rows, setRows] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuestions(status === "ALL" ? {} : { status });
      setRows(data);
    } catch {
      setError("Could not load questions.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: "submit" | "publish" | "reject", question: Question) => {
    try {
      if (action === "submit") await submitQuestion(question.id);
      else if (action === "publish") await publishQuestion(question.id);
      else {
        const comment = window.prompt("Rejection comment (required):") ?? "";
        if (!comment.trim()) return;
        await rejectQuestion(question.id, comment.trim());
      }
      await load();
    } catch {
      setError("That action is not allowed or failed.");
    }
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
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

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((question) => (
            <li key={question.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span
                    className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[question.status]}`}
                  >
                    {question.status}
                  </span>
                  <LatexPreview
                    text={question.prompt_fr || question.prompt_ar}
                    className="text-sm text-gray-800"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {question.kind} · difficulty {question.difficulty} · topic {question.topic}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {question.status === "DRAFT" ? (
                    <button
                      type="button"
                      onClick={() => void act("submit", question)}
                      className="rounded-full bg-gray-800 px-3 py-1 text-xs text-white"
                    >
                      Submit
                    </button>
                  ) : null}
                  {question.status === "IN_REVIEW" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void act("publish", question)}
                        className="rounded-full bg-emerald-600 px-3 py-1 text-xs text-white"
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => void act("reject", question)}
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
  );
}
