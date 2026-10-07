"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchQuestion, type Question } from "../../../../lib/assessmentApi";
import { QuestionForm } from "../../components/QuestionForm";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchQuestion(id)
      .then(setQuestion)
      .catch(() => setError("Could not load this question."));
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!question) return <p className="text-sm text-gray-500">Loading…</p>;
  if (question.status !== "DRAFT") {
    return (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        Only DRAFT questions can be edited. This question is {question.status}.
      </p>
    );
  }

  return (
    <QuestionForm
      initial={question}
      onSaved={() => {
        router.push("/dashboard/assessment");
      }}
    />
  );
}
