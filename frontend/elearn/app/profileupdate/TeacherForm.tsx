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
    teaching_subjects: teacher.teaching_subjects || "", // Initialize as a string
    price: teacher.price || 0,
    phone_number: teacher.phone_number || "",
    profession: teacher.profession || "",
    degree: teacher.degree || "",
    wilaya: teacher.wilaya || "",
    university: teacher.university || "",
  });

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Teaching Level</label>
        <select
          name="teaching_level" // Add the name attribute
          value={formData.teaching_level || ""}
          onChange={handleChange}
          className="mt-1 py-2 block w-full rounded-md border-gray-300 shadow-sm"
        >
          <option value="" disabled>
            اختيار
          </option>
          <option value="" disabled>اختيار</option>
          <option value="PRIMARY">ابتدائي</option>
          <option value="MIDDLE">متوسط</option>
          <option value="SECONDARY">ثانوي</option>
          <option value="HIGHER">دراسات عليا</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Teaching Subject</label>
        <select
          name="teaching_subjects"
          value={formData.teaching_subjects || ""} // Single value
          onChange={handleChange}
          className="mt-1 block w-full py-2 rounded-md border-gray-300 shadow-sm"
        >
          <option value="" disabled>
            Select a subject
          </option>
          {subjects.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Price</label>
        <input
          type="number"
          name="price"
          value={formData.price || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
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
      <div>
        <label className="block text-sm font-medium text-gray-700">Degree</label>
        <input
          type="text"
          name="degree"
          value={formData.degree || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
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
      <div>
        <label className="block text-sm font-medium text-gray-700">University</label>
        <input
          type="text"
          name="university"
          value={formData.university || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Save Changes
      </button>
    </form>
  );
};

export default TeacherForm;