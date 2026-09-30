"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import axiosClientInstance from "../../../lib/axiosInstance";
import { createGroup } from "../../../lib/groupsApi";
import { Student, Grade } from "../../../types/student";

interface LanguageOption {
  id: string;
  name: string;
}

interface LanguageLevelOption {
  id: string;
  name: string;
}

function CreateGroup() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [name, setName] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<Grade | undefined>();
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [languageLevels, setLanguageLevels] = useState<LanguageLevelOption[]>([]);
  const [language, setLanguage] = useState("");
  const [languageLevel, setLanguageLevel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const searchParams = useSearchParams();
  const school_Level = searchParams.get("school_Level") ?? "";
  const field_of_study = searchParams.get("field") ?? "";
  const gradeParam = searchParams.get("grade") ?? "";
  const langParam = searchParams.get("lang") ?? "";
  const isLanguage = school_Level === "لغات اجنبية" || Boolean(langParam);

  const router = useRouter();
  const pathname = usePathname();
  const newPath = pathname.replace("/create", "");
  const queryString = searchParams.toString();
  const backUrl = queryString ? `${newPath}?${queryString}` : newPath;

  useEffect(() => {
    axiosClientInstance
      .get("/subscriptions/subscriptions/subscribed_students/")
      .then((res) => setStudents(res.data))
      .catch((err) => console.error("Error fetching students:", err));

    if (!isLanguage) {
      axiosClientInstance
        .get("/grades/", { params: { school_level: school_Level } })
        .then((res) => setGrades(res.data))
        .catch((err) => console.error("Error fetching grades:", err));
    } else {
      axiosClientInstance
        .get("/lan/languages/")
        .then((res) => {
          setLanguages(res.data);
          if (langParam) {
            const matched = res.data.find((l: LanguageOption) => l.name === langParam);
            if (matched) setLanguage(matched.id);
          }
        })
        .catch((err) => console.error("Error fetching languages:", err));
      axiosClientInstance
        .get("/lan/language-level/")
        .then((res) => setLanguageLevels(res.data))
        .catch((err) => console.error("Error fetching language levels:", err));
    }
  }, [isLanguage, school_Level, langParam]);

  useEffect(() => {
    if (!gradeParam || selectedGrade || grades.length === 0) return;
    const matched = grades.find((g) => g.id === gradeParam);
    if (matched) setSelectedGrade(matched);
  }, [gradeParam, grades, selectedGrade]);

  const filteredStudents = useMemo(() => {
    if (isLanguage) return students;
    if (!selectedGrade) return students;
    return students.filter((student) => student.grade?.id === selectedGrade.id);
  }, [students, selectedGrade, isLanguage]);

  const toggleStudent = (student: Student) => {
    setSelectedStudents((prev) =>
      prev.some((s) => s.id === student.id)
        ? prev.filter((s) => s.id !== student.id)
        : [...prev, student]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("يرجى إدخال اسم المجموعة.");
      return;
    }
    if (!isLanguage && !selectedGrade) {
      setError("يرجى اختيار المستوى الدراسي.");
      return;
    }
    if (isLanguage && (!language || !languageLevel)) {
      setError("يرجى اختيار اللغة والمستوى.");
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      students: selectedStudents.map((student) => student.id),
    };

    if (isLanguage) {
      payload.language = language;
      payload.language_level = languageLevel;
    } else {
      payload.school_level = school_Level;
      payload.grade = selectedGrade?.id;
      if (field_of_study) payload.field_of_study = field_of_study;
    }

    setSubmitting(true);
    try {
      await createGroup(payload);
      setSuccess("تم إنشاء المجموعة بنجاح، سيتم تحويلك...");
      setTimeout(() => window.location.replace(backUrl), 800);
    } catch (err: any) {
      console.error("Error submitting data:", err);
      const data = err?.response?.data;
      setError(
        typeof data === "string"
          ? data
          : data?.detail ||
              data?.[0] ||
              Object.values(data || {})?.[0]?.toString?.() ||
              "تعذر إنشاء المجموعة."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition";

  return (
    <div className="min-h-screen bg-stone-50 px-4 md:px-8 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push(backUrl)}
          className="text-sm text-gray-500 hover:text-gray-800 mb-4"
        >
          → الرجوع إلى المجموعات
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            إنشاء مجموعة جديدة
          </h1>
          <p className="text-gray-500 mb-6">
            {isLanguage
              ? "حدد اللغة والمستوى ثم أضف الطلبة."
              : `${school_Level}${field_of_study ? " - " + field_of_study : ""}`}
          </p>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                اسم المجموعة
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="مثال: مجموعة الرياضيات 2 ثانوي"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {!isLanguage ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  المستوى الدراسي
                </label>
                <select
                  className={inputClass}
                  value={selectedGrade?.id ?? ""}
                  onChange={(e) =>
                    setSelectedGrade(grades.find((g) => g.id === e.target.value))
                  }
                >
                  <option value="">اختر المستوى</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                {field_of_study && (
                  <p className="mt-2 text-xs text-gray-500">
                    الشعبة المحددة مسبقاً من الرابط.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    اللغة
                  </label>
                  <select
                    className={inputClass}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="">اختر اللغة</option>
                    {languages.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    مستوى اللغة
                  </label>
                  <select
                    className={inputClass}
                    value={languageLevel}
                    onChange={(e) => setLanguageLevel(e.target.value)}
                  >
                    <option value="">اختر المستوى</option>
                    {languageLevels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  الطلبة المشتركون
                </label>
                <span className="text-xs text-gray-500">
                  {selectedStudents.length} محدد
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                {filteredStudents.length === 0 && (
                  <p className="p-4 text-sm text-gray-500 text-center">
                    لا يوجد طلبة مشتركون مطابقون.
                  </p>
                )}
                {filteredStudents.map((student) => {
                  const checked = selectedStudents.some((s) => s.id === student.id);
                  return (
                    <label
                      key={student.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                        checked ? "bg-blue-50" : "bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={checked}
                        onChange={() => toggleStudent(student)}
                      />
                      <span className="text-sm text-gray-800">
                        {student.user?.first_name} {student.user?.last_name}
                      </span>
                      {student.grade?.name && (
                        <span className="ml-auto text-xs text-gray-400">
                          {student.grade.name}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? "جارٍ الإنشاء..." : "إنشاء المجموعة"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateGroup;
