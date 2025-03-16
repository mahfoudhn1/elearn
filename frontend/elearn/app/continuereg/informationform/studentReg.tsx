"use client";
import React, { useState, useEffect } from "react";
import { field_of_study, Grade } from "../../types/student";
import axiosClientInstance from "../../lib/axiosInstance";

interface StudentFormProps {
  phone_number: string;
  setPhone_number: (value: string) => void;
  teaching_level:string;
  setTeaching_level: (value: string) => void;
  wilaya: string;
  setWilaya: (value: string) => void;
  grades: Grade[];
  onSubmit: (data: any) => void;
}

const StudentReg: React.FC<StudentFormProps> = ({
  phone_number,
  setPhone_number,
  teaching_level,
  setTeaching_level,
  wilaya,
  setWilaya,
  grades,
  onSubmit,
}) => {
  const [grade_id, setGrade_id] = useState<number>(0);
  const [field_of_study_id, setField_of_study_id] = useState<number>(0);
  const [filteredGrades, setFilteredGrades] = useState<Grade[]>([]);
  const [fieldsOfStudy, setFieldsOfStudy] = useState<field_of_study[]>([]);
  const [availableFields, setAvailableFields] = useState<field_of_study[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Fetch fields of study from the backend
  useEffect(() => {
    const fetchFieldsOfStudy = async () => {
      try {
        const fieldsResponse = await axiosClientInstance.get<field_of_study[]>("/fieldofstudy/");
        setFieldsOfStudy(fieldsResponse.data);
      } catch (error) {
        console.error("Error fetching fields of study:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFieldsOfStudy();
  }, []);

  // Filter grades based on the selected school level
  useEffect(() => {
    if (grade_id) {
      const selectedGrade = grades.find((grade) => grade.id === grade_id);
      if (selectedGrade) {
        const filtered = grades.filter((grade) => grade.school_level === selectedGrade.school_level);
        setFilteredGrades(filtered);
      }
    }
  }, [grade_id, grades]);

  // Update available fields of study based on the selected grade
  useEffect(() => {
    if (grade_id) {
      const selectedGrade = grades.find((grade) => grade.id === grade_id);
      if (selectedGrade && selectedGrade.school_level === "ثانوي") {
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
      } else {
        setAvailableFields([]);
      }
    }
  }, [grade_id, grades, fieldsOfStudy]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "grade_id") {
      setGrade_id(Number(value));
      setField_of_study_id(0); // Reset field_of_study_id when grade changes
    } else if (name === "field_of_study_id") {
      setField_of_study_id(Number(value));
    } else if (name === "phone_number") {
      setPhone_number(value);
    } else if (name === "wilaya") {
      setWilaya(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      grade_id,
      field_of_study_id,
      phone_number,
      wilaya,
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
        <label className="block text-gray-700">اختيار الطور</label>
        <select
          name="school_level"
          value={grades.find((grade) => grade.id === grade_id)?.school_level || ""}
          onChange={(e) => {
            const schoolLevel = e.target.value;
            const filtered = grades.filter((grade) => grade.school_level === schoolLevel);
            setFilteredGrades(filtered);
            setGrade_id(0); // Reset grade_id when school level changes
            setField_of_study_id(0); // Reset field_of_study_id when school level changes
          }}
          className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"        >
          <option value="" disabled>اختيار الطور</option>
          <option value="ابتدائي">ابتدائي</option>
          <option value="متوسط">متوسط</option>
          <option value="ثانوي">ثانوي</option>
        </select>
      </div>

      {/* Grade */}
      {filteredGrades.length > 0 && (
        <div>
          <label className="block text-gray-700">اختيار السنة الدراسية</label>

          <select
            name="grade_id"
            value={grade_id || ""}
            onChange={handleChange}
            className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
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
      {availableFields.length > 0 && (
        <div>
          <label className="block text-gray-700">اختيار التخصص</label>

          <select
            name="field_of_study_id"
            value={field_of_study_id || ""}
            onChange={handleChange}
            className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
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
        <label className="block mb-2 text-sm font-medium text-gray">Phone Number</label>
        <div className="relative">
          <div className="absolute inset-y-0 start-0 top-0 flex items-center ps-3.5 pointer-events-none">
            <svg
              className="w-4 h-4 text-gray"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 19 18"
            >
              <path d="M18 13.446a3.02 3.02 0 0 0-.946-1.985l-1.4-1.4a3.054 3.054 0 0 0-4.218 0l-.7.7a.983.983 0 0 1-1.39 0l-2.1-2.1a.983.983 0 0 1 0-1.389l.7-.7a2.98 2.98 0 0 0 0-4.217l-1.4-1.4a2.824 2.824 0 0 0-4.218 0c-3.619 3.619-3 8.229 1.752 12.979C6.785 16.639 9.45 18 11.912 18a7.175 7.175 0 0 0 5.139-2.325A2.9 2.9 0 0 0 18 13.446Z" />
            </svg>
          </div>
          <input
            type="text"
            id="phone_number"
            name = 'phone_number'
            className="border text-black text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5"
            minLength={10}
            maxLength={10}
            placeholder="123-456-7890"
            value={phone_number}
            onChange={handleChange}
        />
      </div>
      </div>

      {/* Wilaya */}
      <div>
      <label className="block text-sm font-medium text-gray">الولاية</label>
      <input
          type="text"
          name="wilaya"
          value={wilaya || ""}
          onChange={handleChange}
          className="mt-1 p-2 w-full border rounded-md focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
          />
      </div>
     
      {/* Submit Button */}
      <button
          type="submit"
          className="w-full bg-gray-dark text-white p-2 rounded-md hover:bg-green focus:outline-none focus:bg-black focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors duration-300"
        >
          تسجيل
        </button>
    </form>
  );
};

export default StudentReg;