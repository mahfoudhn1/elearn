"use client";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBook,
  faCompassDrafting,
  faFlask,
  faLandmark,
  faLanguage,
  faSquareRootAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { fetchFields, fetchGrades, FieldOption, GradeOption } from "../../lib/groupsApi";

interface FieldIcon {
  icon: any;
  bgColor: string;
}

const FIELD_ICONS: { [key: string]: FieldIcon } = {
  "رياضيات": { icon: faSquareRootAlt, bgColor: "bg-blue-500" },
  "تقني رياضي": { icon: faCompassDrafting, bgColor: "bg-orange-500" },
  "علوم تجريبية": { icon: faFlask, bgColor: "bg-green-500" },
  "تسيير واقتصاد": { icon: faLandmark, bgColor: "bg-slate-700" },
  "آداب وفلسفة": { icon: faBook, bgColor: "bg-yellow-400" },
  "لغات أجنبية": { icon: faLanguage, bgColor: "bg-purple-600" },
};

const SCHOOL_LEVEL = "ثانوي";

const Secondary: React.FC = () => {
  const router = useRouter();
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeOption | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades(SCHOOL_LEVEL)
      .then(setGrades)
      .catch((err) => {
        console.error("Error fetching grades:", err);
        setError("تعذر تحميل المستويات الدراسية.");
      })
      .finally(() => setLoading(false));
  }, []);

  const goToGroups = (grade: GradeOption, field?: FieldOption) => {
    const params = new URLSearchParams({
      school_Level: SCHOOL_LEVEL,
      grade: grade.id,
    });
    if (field) params.set("field", field.id);
    router.push(`/groups/allgroups?${params.toString()}`);
  };

  const handleGrade = async (grade: GradeOption) => {
    setSelectedGrade(grade);
    setFields([]);
    try {
      const list = await fetchFields({ gradeId: grade.id });
      if (list.length === 0) {
        // First year has no streams; go straight to its groups.
        goToGroups(grade);
      } else {
        setFields(list);
      }
    } catch (err) {
      console.error("Error fetching fields of study:", err);
      goToGroups(grade);
    }
  };

  const handleField = (field: FieldOption) => {
    if (selectedGrade) goToGroups(selectedGrade, field);
  };

  return (
    <div className="w-full min-h-screen bg-gray-300 flex flex-col p-8">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
        اختر المستوى الدراسي
      </h1>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
        </div>
      )}

      {!loading && error && <p className="text-center text-red-600">{error}</p>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
          {grades.map((grade) => (
            <button
              key={grade.id}
              onClick={() => handleGrade(grade)}
              className={`py-6 px-4 rounded-xl bg-white shadow hover:-translate-y-1 transition font-semibold text-gray-800 ${
                selectedGrade?.id === grade.id ? "ring-2 ring-blue-500" : ""
              }`}
            >
              {grade.name}
            </button>
          ))}
        </div>
      )}

      {selectedGrade && fields.length > 0 && (
        <>
          <h2 className="text-xl font-semibold text-gray-800 mt-10 mb-4 text-center">
            اختر الشعبة - {selectedGrade.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
            {fields.map((field) => {
              const style = FIELD_ICONS[field.name];
              return (
                <div
                  key={field.id}
                  onClick={() => handleField(field)}
                  className="group relative cursor-pointer overflow-hidden bg-white px-6 py-8 shadow-xl rounded-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center justify-between relative z-10">
                    <span
                      className={`grid h-14 w-14 place-items-center rounded-full ${
                        style?.bgColor ?? "bg-gray-500"
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={style?.icon ?? faBook}
                        className="text-2xl text-white"
                      />
                    </span>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {field.name}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            className="mt-8 mx-auto text-blue-600 underline"
            onClick={() => {
              setSelectedGrade(null);
              setFields([]);
            }}
          >
            الرجوع إلى المستويات
          </button>
        </>
      )}
    </div>
  );
};

export default Secondary;
