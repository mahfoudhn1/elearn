"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { QuestionForm } from "../../components/QuestionForm";

export default function NewQuestionPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {message ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>
      ) : null}
      <QuestionForm
        onSaved={(result) => {
          setMessage(
            `${result.savedAs === "created" ? "Created" : "Saved"} “${
              result.question.prompt_fr || result.question.prompt_ar
            }” as a ${result.question.status} draft.`,
          );
          router.refresh();
        }}
      />
    </div>
  );
}
