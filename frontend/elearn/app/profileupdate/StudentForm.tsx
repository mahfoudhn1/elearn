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

        const fieldsResponse = await axiosClientInstance.get<field_of_study[]>("/fieldofstudy/");
        
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
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* School Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700">School Level</label>
        <select
          name="school_level"
          value={formData.grade?.school_level || ""}
          onChange={handleChange}
          className="mt-1 py-2 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="" disabled>اختيار الطور</option>
          <option value="ابتدائي">ابتدائي</option>
          <option value="متوسط">متوسط</option>
          <option value="ثانوي">ثانوي</option>
        </select>
      </div>

      {/* Grade */}
      {formData.grade?.school_level && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Grade</label>
          <select
            name="grade"
            value={formData.grade?.id || ""}
            onChange={handleChange}
            className="mt-1 py-2 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="" disabled>اختيار السنة</option>
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
        <div>
          <label className="block text-sm font-medium text-gray-700">Field of Study</label>
          <select
            name="field_of_study"
            value={formData.field_of_study?.id || ""}
            onChange={handleChange}
            className="mt-1 py-2 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="" disabled>اختيار التخصص</option>
            {availableFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
        <input
          type="text"
          name="phone_number"
          value={formData.phone_number || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      {/* Wilaya */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Wilaya</label>
        <input
          type="text"
          name="wilaya"
          value={formData.wilaya || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Save Changes
      </button>
    </form>
  );
};

export default StudentForm;