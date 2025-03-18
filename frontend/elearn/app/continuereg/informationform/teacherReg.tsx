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
  bio:string;
  setBio:(value: string) => void;
  onSubmit: ( formData: any) => void;
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
      bio
    });
  };

  return (
    <form method="POST" className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="phone_number" className="block mb-2 text-sm font-medium text-gray">
          رقم الهاتف
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 start-0 top-0 flex items-center ps-3.5 pointer-events-none">
            <svg className="w-4 h-4 text-gray" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 19 18">
              <path d="M18 13.446a3.02 3.02 0 0 0-.946-1.985l-1.4-1.4a3.054 3.054 0 0 0-4.218 0l-.7.7a.983.983 0 0 1-1.39 0l-2.1-2.1a.983.983 0 0 1 0-1.389l.7-.7a2.98 2.98 0 0 0 0-4.217l-1.4-1.4a2.824 2.824 0 0 0-4.218 0c-3.619 3.619-3 8.229 1.752 12.979C6.785 16.639 9.45 18 11.912 18a7.175 7.175 0 0 0 5.139-2.325A2.9 2.9 0 0 0 18 13.446Z" />
            </svg>
          </div>
          <input
            type="text"
            id="phone_number"
            className="border text-black text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5"
            minLength={10}
            maxLength={10}
            placeholder="123-456-7890"
            value={phone_number}
            onChange={(e) => setPhone_number(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label htmlFor="bio" className="block mb-2 text-sm font-medium text-gray">
           BIO :
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 start-0 top-0 flex items-center ps-3.5 pointer-events-none">
            <svg className="w-4 h-4 text-gray" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 19 18">
              <path d="M18 13.446a3.02 3.02 0 0 0-.946-1.985l-1.4-1.4a3.054 3.054 0 0 0-4.218 0l-.7.7a.983.983 0 0 1-1.39 0l-2.1-2.1a.983.983 0 0 1 0-1.389l.7-.7a2.98 2.98 0 0 0 0-4.217l-1.4-1.4a2.824 2.824 0 0 0-4.218 0c-3.619 3.619-3 8.229 1.752 12.979C6.785 16.639 9.45 18 11.912 18a7.175 7.175 0 0 0 5.139-2.325A2.9 2.9 0 0 0 18 13.446Z" />
            </svg>
          </div>
          <textarea

            id="bio"
            className="border text-black text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5"

            placeholder="عرف بنفسك"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray">الولاية</label>
        <input
          type="text"
          id="wilaya"
          value={wilaya}
          onChange={(e) => setWilaya(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
        />
      </div>
      <div>
        <label htmlFor="teaching_level" className="block text-gray-700">
          اختيار الطور
        </label>
        <select
          id="teaching_level"
          value={teaching_level}
          onChange={(e) => setTeaching_level(e.target.value)}
          className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
        >
          <option value="" disabled>اختيار</option>
          <option value="PRIMARY">ابتدائي</option>
          <option value="MIDDLE">متوسط</option>
          <option value="SECONDARY">ثانوي</option>
          <option value="HIGHER">دراسات عليا</option>
        </select>
      </div>
      <div>
        <label htmlFor="subject" className="block text-gray-700">
          اختيار المادة المدرسة
        </label>
        <select
          id="subject"
          value={teaching_subjects}
          onChange={(e) => setTeaching_subjects(e.target.value)}
          className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
        >
          <option value="" disabled>اخيتار المادة</option>
          {subjects.map((subject) => (
            <option key={subject.value} value={subject.value}>
              {subject.label}
            </option>
          ))}
        </select>
      </div>
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
        />
      </div>
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
        />
      </div>
      <div>
        <button
          type="submit"
          className="w-full bg-gray-dark text-white p-2 rounded-md hover:bg-green focus:outline-none focus:bg-black focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors duration-300"
        >
          تسجيل
        </button>
      </div>
    </form>
  );
};

export default TeacherReg;