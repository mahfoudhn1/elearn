"use client";

import { useState } from "react";

import { importQuestions, type ImportReport } from "../../../lib/assessmentApi";

const SAMPLE = `{
  "questions": [
    {
      "external_id": "demo-1",
      "kind": "MCQ_SINGLE",
      "status": "DRAFT",
      "topic": "<topic-uuid>",
      "difficulty": 3,
      "prompt_ar": "ما هو ناتج $2 + 2$؟",
      "prompt_fr": "Combien font $2 + 2$ ?",
      "options": [
        { "text_ar": "٤", "text_fr": "4", "is_correct": true, "order": 1 },
        { "text_ar": "٥", "text_fr": "5", "is_correct": false, "order": 2 }
      ]
    }
  ]
}`;

export default function ImportPage() {
  const [document, setDocument] = useState(SAMPLE);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (dryRun: boolean) => {
    setError(null);
    setBusy(true);
    try {
      const parsed = JSON.parse(document) as Record<string, unknown>;
      setReport(await importQuestions(parsed, dryRun));
    } catch (err) {
      setError(err instanceof SyntaxError ? "Invalid JSON." : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Import document (JSON)</h2>
        <textarea
          className="h-96 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs"
          value={document}
          onChange={(event) => setDocument(event.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(true)}
            className="rounded-full bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Dry run
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(false)}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Import
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Report</h2>
        {!report ? (
          <p className="text-sm text-gray-500">Run a dry run to see what would change.</p>
        ) : (
          <>
            <div className="mb-3 flex gap-3 text-sm">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                created {report.created}
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
                updated {report.updated}
              </span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                errors {report.errors}
              </span>
              {report.dry_run ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                  dry run
                </span>
              ) : null}
            </div>
            <ul className="flex max-h-[28rem] flex-col gap-1 overflow-auto text-sm">
              {report.rows.map((row, index) => (
                <li
                  key={index}
                  className={`rounded-lg p-2 ${
                    row.action === "error" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="font-medium">{row.action}</span>{" "}
                  {row.external_id ?? "—"}
                  {row.errors && Object.keys(row.errors).length > 0 ? (
                    <span className="block text-xs">
                      {Object.entries(row.errors)
                        .map(([field, message]) => `${field}: ${message}`)
                        .join("; ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
