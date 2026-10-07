"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchClassAnalytics,
  fetchTeacherClasses,
  fetchTeacherOverview,
  type ClassAnalytics,
  type TeacherClass,
} from "../../../lib/assessmentApi";

const BUCKET_ORDER = ["strong", "secure", "developing", "weak", "no_data"] as const;
const BUCKET_COLOR: Record<string, string> = {
  strong: "bg-emerald-500",
  secure: "bg-teal-400",
  developing: "bg-amber-400",
  weak: "bg-red-400",
  no_data: "bg-gray-300",
};

export default function ClassAnalyticsPage() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchTeacherClasses();
      setClasses(list);
      const payload = selected
        ? await fetchClassAnalytics(selected)
        : await fetchTeacherOverview();
      setData(payload);
    } catch {
      setError("Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="mb-1 block text-xs text-gray-500">Class</label>
        <select
          className="w-72 rounded-lg border border-gray-200 p-2 text-sm"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">All my students</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.student_count})
            </option>
          ))}
        </select>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {loading || !data ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : data.student_count === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-sm">
          No students with assessment data yet.
        </p>
      ) : (
        <>
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Topic mastery distribution · {data.student_count} students
            </h2>
            <ul className="flex flex-col gap-2">
              {data.topic_mastery.length === 0 ? (
                <li className="text-sm text-gray-500">No topic mastery recorded.</li>
              ) : (
                data.topic_mastery.map((row) => {
                  const total = BUCKET_ORDER.reduce(
                    (sum, bucket) => sum + (row.distribution[bucket] ?? 0),
                    0,
                  );
                  return (
                    <li key={row.topic}>
                      <div className="mb-1 flex justify-between text-xs text-gray-600">
                        <span className="truncate">{row.title_fr || row.title_ar}</span>
                        <span>
                          {row.avg_mastery === null
                            ? "no data"
                            : `avg ${Math.round(row.avg_mastery * 100)}%`}
                        </span>
                      </div>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                        {BUCKET_ORDER.map((bucket) => {
                          const count = row.distribution[bucket] ?? 0;
                          if (!count || !total) return null;
                          return (
                            <div
                              key={bucket}
                              className={BUCKET_COLOR[bucket]}
                              style={{ width: `${(count / total) * 100}%` }}
                              title={`${bucket}: ${count}`}
                            />
                          );
                        })}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Most-missed questions</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {data.most_missed_questions.length === 0 ? (
                <li className="text-gray-500">No attempts recorded.</li>
              ) : (
                data.most_missed_questions.map((row) => (
                  <li key={row.question} className="flex justify-between gap-3 border-b border-gray-50 py-1">
                    <span className="truncate text-gray-800" dir="auto">
                      {row.prompt_fr || row.prompt_ar}
                    </span>
                    <span className="shrink-0 text-red-600">
                      {Math.round(row.wrong_rate * 100)}% wrong ({row.wrong}/{row.attempts})
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Common misconceptions</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {data.common_misconceptions.length === 0 ? (
                <li className="text-gray-500">None detected.</li>
              ) : (
                data.common_misconceptions.map((row) => (
                  <li key={row.misconception} className="flex justify-between gap-3 py-1">
                    <span className="text-gray-800">{row.code}</span>
                    <span className="text-gray-500">{row.count}×</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Students at risk</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {data.students_at_risk.length === 0 ? (
                <li className="text-gray-500">No students below the risk threshold.</li>
              ) : (
                data.students_at_risk.map((row) => (
                  <li key={row.student} className="rounded-xl bg-red-50 p-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-800">{row.name}</span>
                      <span className="text-red-600">
                        avg {Math.round(row.avg_mastery * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {row.weak_topics.length} weak topic(s)
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
