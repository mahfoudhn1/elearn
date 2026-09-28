import React, { useState } from "react";

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

interface TeacherFormProps {
  phone_number: string;
  setPhone_number: (value: string) => void;
  teaching_level: string;
  setTeaching_level: (value: string) => void;
  wilaya: string;
  setWilaya: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
  onSubmit: (formData: any) => void;
}

const TeacherReg: React.FC<TeacherFormProps> = ({
  phone_number,
  setPhone_number,
  teaching_level,
  setTeaching_level,
  wilaya,
  setWilaya,
  bio,
  setBio,
  onSubmit,
}) => {
  const [teaching_subjects, setTeaching_subjects] = useState("");
  const [degree, setDegree] = useState("");
  const [university, setUniversity] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      teaching_level,
      teaching_subjects,
      phone_number,
      wilaya,
      degree,
      university,
      bio,
    });
  };

  return (
    <form method="POST" className="space-y-4" onSubmit={handleSubmit}>
      {/* Phone Number */}
      <div>
      <label className="block mb-1 font-medium">رقم الهاتف <span className="text-oragne-600"> (ضروري) </span> </label>

        <input
          type="text"
          id="phone_number"
          className="border text-black text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          minLength={10}
          maxLength={10}
          pattern="^0[0-9]{9}$"
          placeholder="06xxxxxxxx"
          value={phone_number}
          onChange={(e) => setPhone_number(e.target.value)}
          required
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block mb-2 text-sm font-medium text-gray">
          BIO :
        </label>
        <textarea
          id="bio"
          className="border text-black text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          placeholder="عرف بنفسك"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          required
        />
      </div>

      {/* Wilaya */}
      <div>
        <label className="block text-sm font-medium text-gray">الولاية</label>
        <input
          type="text"
          id="wilaya"
          value={wilaya}
          onChange={(e) => setWilaya(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
          required
        />
      </div>

      {/* Teaching Level */}
      <div>
        <label htmlFor="teaching_level" className="block text-gray-700">
          اختيار الطور
        </label>
        <select
          id="teaching_level"
          value={teaching_level}
          onChange={(e) => setTeaching_level(e.target.value)}
          className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
          required
        >
          <option value="" disabled>اختيار</option>
          <option value="PRIMARY">ابتدائي</option>
          <option value="MIDDLE">متوسط</option>
          <option value="SECONDARY">ثانوي</option>
          <option value="HIGHER">دراسات عليا</option>
        </select>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-gray-700">
          اختيار المادة المدرسة
        </label>
        <select
          id="subject"
          value={teaching_subjects}
          onChange={(e) => setTeaching_subjects(e.target.value)}
          className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
          required
        >
          <option value="" disabled>اختيار المادة</option>
          {subjects.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </select>
      </div>

      {/* Degree */}
      <div>
        <label className="block text-sm font-medium text-gray">
          الشهادة المتحصل عليها
        </label>
        <input
          type="text"
          id="degree"
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
          required
        />
      </div>

      {/* University */}
      <div>
        <label className="block text-sm font-medium text-gray">
          الجامعة المانحة للشهادة
        </label>
        <input
          type="text"
          id="university"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
          required
        />
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          className="w-full bg-grey-900 text-white p-2 rounded-md hover:bg-orange-600 focus:outline-none focus:bg-black focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors duration-300"
        >
          تسجيل
        </button>
      </div>
    </form>
  );
};

export default TeacherReg;
