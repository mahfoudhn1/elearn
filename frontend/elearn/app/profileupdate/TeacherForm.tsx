"use client";
import React, { useState } from "react";
import { Teacher } from "../types/student";

interface TeacherFormProps {
  teacher: Teacher;
  onSubmit: (data: Partial<Teacher>) => void;
}

const subjects = [
  { value: "رياضيات", label: "رياضيات" },
  { value: "فيزياء", label: "فيزياء" },
  { value: "كيمياء", label: "كيمياء" },
  { value: "أحياء", label: "أحياء" },
  { value: "فرنسية", label: "فرنسية" },
  { value: "عربية", label: "عربية" },
  { value: "إنجليزية", label: "إنجليزية" },
  { value: "تاريخ", label: "تاريخ" },
  { value: "جغرافيا", label: "جغرافيا" },
  { value: "فلسفة", label: "فلسفة" },
  { value: "اقتصاد", label: "اقتصاد" },
];

const TeacherForm: React.FC<TeacherFormProps> = ({ teacher, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<Teacher>>({
    teaching_level: teacher.teaching_level || "",
    teaching_subjects: teacher.teaching_subjects || "",
    price: teacher.price || 0,
    phone_number: teacher.phone_number || "",
    profession: teacher.profession || "",
    degree: teacher.degree || "",
    wilaya: teacher.wilaya || "",
    university: teacher.university || "",
  });

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto p-6 bg-white rounded-2xl shadow-lg space-y-6"
      dir="rtl"
    >
      <h2 className="text-2xl font-semibold text-gray-800 text-center">
        تعديل بيانات المعلم
      </h2>

      {/* Teaching Level */}
      <div className="space-y-2">
        <label
          htmlFor="teaching_level"
          className="block text-sm font-medium text-gray-600"
        >
          الطور التعليمي
        </label>
        <select
          id="teaching_level"
          name="teaching_level"
          value={formData.teaching_level || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
        >
          <option value="" disabled>
            اختيار الطور
          </option>
          <option value="PRIMARY">ابتدائي</option>
          <option value="MIDDLE">متوسط</option>
          <option value="SECONDARY">ثانوي</option>
          <option value="HIGHER">دراسات عليا</option>
        </select>
      </div>

      {/* Teaching Subject */}
      <div className="space-y-2">
        <label
          htmlFor="teaching_subjects"
          className="block text-sm font-medium text-gray-600"
        >
          المادة التعليمية
        </label>
        <select
          id="teaching_subjects"
          name="teaching_subjects"
          value={formData.teaching_subjects || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
        >
          <option value="" disabled>
            اختيار المادة
          </option>
          {subjects.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      {/* <div className="space-y-2">
        <label
          htmlFor="price"
          className="block text-sm font-medium text-gray-600"
        >
          السعر
        </label>
        <input
          id="price"
          type="number"
          name="price"
          value={formData.price || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
          placeholder="أدخل السعر"
        />
      </div> */}

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

      {/* Profession */}
      <div className="space-y-2">
        <label
          htmlFor="profession"
          className="block text-sm font-medium text-gray-600"
        >
          المهنة
        </label>
        <input
          id="profession"
          type="text"
          name="profession"
          value={formData.profession || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
          placeholder="أدخل المهنة"
        />
      </div>

      {/* Degree */}
      <div className="space-y-2">
        <label
          htmlFor="degree"
          className="block text-sm font-medium text-gray-600"
        >
          الشهادة
        </label>
        <input
          id="degree"
          type="text"
          name="degree"
          value={formData.degree || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
          placeholder="أدخل الشهادة"
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

      {/* University */}
      <div className="space-y-2">
        <label
          htmlFor="university"
          className="block text-sm font-medium text-gray-600"
        >
          الجامعة
        </label>
        <input
          id="university"
          type="text"
          name="university"
          value={formData.university || ""}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none text-right"
          placeholder="أدخل اسم الجامعة"
        />
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <label
          htmlFor="file"
          className="block text-sm font-medium text-gray-600"
        >
          وثيقة إثبات
        </label>
        <div className="flex items-center space-x-4 space-x-reverse">
          {filePreview && (
            <img
              src={filePreview}
              alt="معاينة الوثيقة"
              className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
            />
          )}
          <label className="flex-1">
            <span className="inline-block w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors text-center">
              اختيار ملف
            </span>
            <input
              id="file"
              type="file"
              name="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
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

export default TeacherForm;