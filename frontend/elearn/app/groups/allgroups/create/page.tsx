"use client"

import React, { useEffect, useState } from 'react'
import axiosClientInstance from '../../../lib/axiosInstance';
import { Student, Grade } from '../../../types/student';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

function CreateGroup() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [grade, setGrade] = useState<Grade[]>([]);
  const [name, setName] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<Grade | undefined>();
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  const [languages, setLanguages] = useState<any[]>([]);
  const [languageLevels, setLanguageLevels] = useState<any[]>([]);
  const [language, setLanguage] = useState<string>('');
  const [languageLevel, setLanguageLevel] = useState<string>('');

  const searchParams = useSearchParams();
  const school_Level = searchParams.get('school_Level');
  const field_of_study = searchParams.get('field');
  const router = useRouter();
  const pathname = usePathname();
  const newPath = pathname.replace("/create", "");
  const queryString = searchParams.toString();
  const newUrl = queryString ? `${newPath}?${queryString}` : newPath;

  useEffect(() => {
    const fetchStudents = () => {
      axiosClientInstance
        .get(`/subscriptions/subscriptions/subscribed_students/`)
        .then((response) => setStudents(response.data))
        .catch((error) => console.error('Error fetching students:', error));
    };

    const fetchGrade = () => {
      if (school_Level !== "لغات اجنبية") {
        axiosClientInstance.get(`/grades/?school_level=${school_Level}`)
          .then((response) => setGrade(response.data))
          .catch((error) => console.error('Error fetching grades:', error));
      }
    };

    const fetchLanguages = () => {
      if (school_Level === "لغات اجنبية") {
        axiosClientInstance.get(`lan/languages/`)
          .then((response) => setLanguages(response.data))
          .catch((error) => console.error('Error fetching languages:', error));
        axiosClientInstance.get(`lan/language-level/`)
          .then((response) => setLanguageLevels(response.data))
          .catch((error) => console.error('Error fetching language levels:', error));
      }
    };

    fetchGrade();
    fetchStudents();
    fetchLanguages();
    
  }, [school_Level]);

  const handleGradeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGradeName = event.target.value;
    const selectedGradeObj = grade.find((g) => g.name === selectedGradeName);
    setSelectedGrade(selectedGradeObj);

    if (selectedGradeObj) {
      const filtered = students.filter((student) => student.grade.id === selectedGradeObj.id);
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  };

  const handleCheckboxChange = (student: Student) => {
    setSelectedStudents(prev =>
      prev.some(s => s.id === student.id)
        ? prev.filter(s => s.id !== student.id)
        : [...prev, student]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const dataToSubmit: any = {
      name,
      students: selectedStudents.map((student) => student.id),
      school_level: school_Level,
    };

    if (school_Level === "لغات اجنبية") {
      dataToSubmit.language = language;
      dataToSubmit.language_level = languageLevel;
    } else {
      dataToSubmit.grade = selectedGrade?.id;
    }

    if (field_of_study) {
      dataToSubmit.field_of_study = field_of_study;
    }

    try {
      const response = await axiosClientInstance.post('/groups/', dataToSubmit);
      console.log('Response:', response.data);
      window.location.replace(newUrl);
    } catch (error) {
      console.error('Error submitting data:', error);
    }
  };

  return (
    <div className='p-10 mx-auto flex flex-col justify-center'>
      <form className="w-full max-w-lg" onSubmit={handleSubmit}>
        {/* Group Name */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">اسم المجموعة</label>
          <input
            type="text"
            className="w-full bg-gray-200 rounded px-4 py-3"
            placeholder="مجموعة 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Conditional Grade or Language Selection */}
        {school_Level !== "لغات اجنبية" ? (
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2">المستوى الدراسي</label>
            <select
              className="w-full bg-gray-200 rounded px-4 py-3"
              onChange={handleGradeChange}
              value={selectedGrade?.name || ''}
            >
              <option>اختيار المستوى</option>
              {grade.map((g) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">اللغة</label>
              <select
                className="w-full bg-gray-200 rounded px-4 py-3"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option>اختيار اللغة</option>
                {languages.map((lang) => (
                  <option key={lang.id} value={lang.name}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">مستوى اللغة</label>
              <select
                className="w-full bg-gray-200 rounded px-4 py-3"
                value={languageLevel}
                onChange={(e) => setLanguageLevel(e.target.value)}
              >
                <option>اختيار المستوى</option>
                {languageLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.name}>{lvl.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </form>

      {/* Student Checkboxes */}
      {filteredStudents.map((student) => (
        <div key={student.id} className='flex items-center space-x-2 mb-2'>
          <input
            type="checkbox"
            checked={selectedStudents.some(s => s.id === student.id)}
            onChange={() => handleCheckboxChange(student)}
          />
          <span>{student.user.first_name} {student.user.last_name}</span>
        </div>
      ))}

      <button
        className='bg-gray-800 text-white px-4 py-2 rounded mt-4'
        onClick={handleSubmit}
      >
        إنشاء المجموعة
      </button>
    </div>
  );
}

export default CreateGroup;
