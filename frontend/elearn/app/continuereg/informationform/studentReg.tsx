"use client";
import React, { useState, useEffect } from "react";
import { field_of_study, Grade } from "../../types/student";
import axiosClientInstance from "../../lib/axiosInstance";

interface StudentFormProps {
  phone_number: string;
  setPhone_number: (value: string) => void;
  teaching_level: string;
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
  const [grade_id, setGrade_id] = useState<string>("");
  const [field_of_study_id, setField_of_study_id] = useState<string>("");
  const [filteredGrades, setFilteredGrades] = useState<Grade[]>([]);
  const [fieldsOfStudy, setFieldsOfStudy] = useState<field_of_study[]>([]);
  const [availableFields, setAvailableFields] = useState<field_of_study[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  useEffect(() => {
    if (grade_id) {
      const selectedGrade = grades.find((grade) => grade.id === grade_id);
      if (selectedGrade) {
        const filtered = grades.filter((grade) => grade.school_level === selectedGrade.school_level);
        setFilteredGrades(filtered);
      }
    }
  }, [grade_id, grades]);

  useEffect(() => {
    if (grade_id) {
      const selectedGrade = grades.find((grade) => grade.id === grade_id);
      if (selectedGrade && selectedGrade.school_level === "ثانوي") {
        if (selectedGrade.name === "السنة الاولى") {
          setAvailableFields(
            fieldsOfStudy.filter(
              (field) => field.name === "ادب و فلسفة" || field.name === "علوم تجريبية"
            )
          );
        } else if (selectedGrade.name === "السنة الثانية" || selectedGrade.name === "السنة الثالثة") {
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
      setGrade_id(value);
      setField_of_study_id("");
    } else if (name === "field_of_study_id") {
      setField_of_study_id(value);
    } else if (name === "phone_number") {
      setPhone_number(value);
    } else if (name === "wilaya") {
      setWilaya(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      grade_id,
      field_of_study_id,
      phone_number,
      wilaya,
    });
  };

  if (isLoading) return <div className="text-gray-300 text-center">جار التحميل...</div>;

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto p-6 bg-white text-grey rounded-xl shadow-lg space-y-5"
    >
      <h2 className="text-2xl font-bold text-orange-600 text-center">تسجيل الطالب</h2>

      {/* School Level */}
      <div className="">
        <label className="block mb-1 font-medium">اختيار الطور</label>
        <select
          name="school_level"
          value={grades.find((grade) => grade.id === grade_id)?.school_level || ""}
          onChange={(e) => {
            const schoolLevel = e.target.value;
            setFilteredGrades(grades.filter((grade) => grade.school_level === schoolLevel));
            setGrade_id("");
            setField_of_study_id("");
          }}
          className="mt-1 p-2 w-full rounded-md border border-gray-700 focus:ring-2 focus:ring-orange-600"
          required
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
      {filteredGrades.length > 0 && (
        <div>
          <label className="block mb-1 font-medium">اختيار السنة الدراسية</label>
          <select
            name="grade_id"
            value={grade_id || ""}
            onChange={handleChange}
            className="mt-1 p-2 w-full rounded-md  border border-gray-700 focus:ring-2 focus:ring-orange-600"
            required
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
      {availableFields.length > 0 && (
        <div>
          <label className="block mb-1 font-medium">اختيار التخصص</label>
          <select
            name="field_of_study_id"
            value={field_of_study_id || ""}
            onChange={handleChange}
            className="mt-1 p-2 w-full rounded-md  border border-gray-700 focus:ring-2 focus:ring-orange-600"
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
      <div>
        <label className="block mb-1 font-medium">رقم الهاتف <span className="text-oragne-600"> (ضروري) </span> </label>
        <input
          type="text"
          name="phone_number"
          className="w-full p-2 rounded-md  border border-gray-700 focus:ring-2 focus:ring-orange-600"
          minLength={10}
          maxLength={10}
          placeholder="06xxxxxxxx"
          value={phone_number}
          onChange={handleChange}
          required
        />
      </div>

      {/* Wilaya */}
      <div>
        <label className="block mb-1 font-medium">الولاية</label>
        <input
          type="text"
          name="wilaya"
          value={wilaya || ""}
          onChange={handleChange}
          className="w-full p-2 rounded-md  border border-gray-700 focus:ring-2 focus:ring-orange-600"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="w-full py-2 bg-grey-900 hover:bg-orange-600 rounded-md font-semibold text-white transition"
      >
        تسجيل
      </button>
    </form>
  );
};

export default StudentReg;
