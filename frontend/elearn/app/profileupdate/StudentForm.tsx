"use client";
import React, { useState, useEffect } from "react";
import { Student, Grade, field_of_study } from "../types/student";
import axiosClientInstance from "../lib/axiosInstance";

interface StudentFormProps {
  student: Student;
  onSubmit: (data: Partial<Student>) => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ student, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<Student>>({
    grade: student.grade || { id: 0, name: "", school_level: "" },
    field_of_study: student.field_of_study || { id: 0, name: "" },
    phone_number: student.phone_number || "",
    wilaya: student.wilaya || "",
  });

  const [grades, setGrades] = useState<Grade[]>([]);
  const [filteredGrades, setFilteredGrades] = useState<Grade[]>([]);
  const [fieldsOfStudy, setFieldsOfStudy] = useState<field_of_study[]>([]);
  const [availableFields, setAvailableFields] = useState<field_of_study[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync formData with student prop changes
  useEffect(() => {
    setFormData({
      grade: student.grade || { id: 0, name: "", school_level: "" },
      field_of_study: student.field_of_study || { id: 0, name: "" },
      phone_number: student.phone_number || "",
      wilaya: student.wilaya || "",
    });
  }, [student]);

  // Fetch grades and fields of study from the backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const gradesResponse = await axiosClientInstance.get<Grade[]>("/grades/");
        setGrades(gradesResponse.data);

        const fieldsResponse = await axiosClientInstance.get<field_of_study[]>(
          "/fieldofstudy/"
        );
        setFieldsOfStudy(fieldsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter grades based on grade.school_level
  useEffect(() => {
    if (formData.grade?.school_level) {
      const filtered = grades.filter(
        (grade) => grade.school_level === formData.grade?.school_level
      );
      setFilteredGrades(filtered);
    } else {
      setFilteredGrades(grades);
    }
  }, [formData.grade?.school_level, grades]);

  // Filter fields of study based on grade
  useEffect(() => {
    if (formData.grade?.school_level === "ثانوي" && formData.grade?.id) {
      const selectedGrade = filteredGrades.find(
        (g) => g.id === formData.grade?.id
      );
      if (selectedGrade) {
        if (selectedGrade.name === "السنة الاولى") {
          const firstYearFields = fieldsOfStudy.filter(
            (field) => field.name === "ادب و فلسفة" || field.name === "علوم تجريبية"
          );
          setAvailableFields(firstYearFields);
        } else if (
          selectedGrade.name === "السنة الثانية" ||
          selectedGrade.name === "السنة الثالثة"
        ) {
          setAvailableFields(fieldsOfStudy);
        } else {
          setAvailableFields([]);
        }
      }
    } else {
      setAvailableFields([]);
      setFormData((prev) => ({ ...prev, field_of_study: { id: 0, name: "" } }));
    }
  }, [formData.grade, filteredGrades, fieldsOfStudy]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "school_level") {
      const filtered = grades.filter((grade) => grade.school_level === value);
      setFilteredGrades(filtered);
      setFormData({
        ...formData,
        grade: { id: 0, name: "", school_level: value },
        field_of_study: { id: 0, name: "" },
      });
    } else if (name === "grade") {
      const selectedGrade = grades.find((grade) => grade.id === Number(value));
      if (selectedGrade) {
        setFormData({ ...formData, grade: selectedGrade });
      }
    } else if (name === "field_of_study") {
      const selectedFieldOfStudy = fieldsOfStudy.find(
        (field) => field.id === Number(value)
      );
      if (selectedFieldOfStudy) {
        setFormData({ ...formData, field_of_study: selectedFieldOfStudy });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      grade: formData.grade,
      field_of_study: formData.field_of_study,
      phone_number: formData.phone_number,
      wilaya: formData.wilaya,
    };
    onSubmit(submitData);
  };

  if (isLoading) {
    return <div className="text-center text-gray-600">جارٍ التحميل...</div>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto p-6 bg-white rounded-2xl shadow-lg space-y-6"
      dir="rtl"
    >
      <h2 className="text-2xl font-semibold text-gray-800 text-center">
        تعديل بيانات الطالب
      </h2>

      {/* School Level */}
      <div className="space-y-2">
        <label
          htmlFor="school_level"
          className="block text-sm font-medium text-gray-600"
        >
          الطور التعليمي
        </label>
        <select
          id="school_level"
          name="school_level"
          value={formData.grade?.school_level || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
        >
          <option value="" disabled>
            اختيار الطور
          </option>
          <option value="ابتدائي">ابتدائي</option>
          <option value="متوسط">متوسط</option>
          <option value="ثانوي">ثانوي</option>
        </select>
      </div>

      {/* Grade */}
      {formData.grade?.school_level && (
        <div className="space-y-2">
          <label
            htmlFor="grade"
            className="block text-sm font-medium text-gray-600"
          >
            السنة الدراسية
          </label>
          <select
            id="grade"
            name="grade"
            value={formData.grade?.id || ""}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
          >
            <option value="" disabled>
              اختيار السنة
            </option>
            {filteredGrades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Field of Study */}
      {formData.grade?.school_level === "ثانوي" && availableFields.length > 0 && (
        <div className="space-y-2">
          <label
            htmlFor="field_of_study"
            className="block text-sm font-medium text-gray-600"
          >
            التخصص
          </label>
          <select
            id="field_of_study"
            name="field_of_study"
            value={formData.field_of_study?.id || ""}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
          >
            <option value="" disabled>
              اختيار التخصص
            </option>
            {availableFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Phone Number */}
      <div className="space-y-2">
        <label
          htmlFor="phone_number"
          className="block text-sm font-medium text-gray-600"
        >
          رقم الهاتف
        </label>
        <input
          id="phone_number"
          type="text"
          name="phone_number"
          value={formData.phone_number || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
          placeholder="أدخل رقم الهاتف"
        />
      </div>

      {/* Wilaya */}
      <div className="space-y-2">
        <label
          htmlFor="wilaya"
          className="block text-sm font-medium text-gray-600"
        >
          الولاية
        </label>
        <input
          id="wilaya"
          type="text"
          name="wilaya"
          value={formData.wilaya || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
          placeholder="أدخل اسم الولاية"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium"
      >
        حفظ التغييرات
      </button>
    </form>
  );
};

export default StudentForm;