"use client";
import React, { useState, useEffect, ChangeEvent } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axiosClientInstance from "../lib/axiosInstance";
import Sidebar from "../components/dahsboardcomponents/sidebar";
import { Teacher } from "../types/student";

interface Filters {
  teaching_level: string;
  teaching_subjects: string;
  wilaya: string;
  search: string;
}


const filtersToQueryParams = (filters: Filters): Record<string, string> => {
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      queryParams[key] = value;
    }
  }
  return queryParams;
};

const fetchTeachers = async (filters: Filters): Promise<Teacher[]> => {
  const queryParams = new URLSearchParams(filtersToQueryParams(filters)).toString();
  const response = await axiosClientInstance.get(`/teachers/?${queryParams}`);
  if (!response) {
    throw new Error("Network response was not ok");
  }
  console.log(response.data);
  
  return response.data;

};

const TeacherFilter: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [filters, setFilters] = useState<Filters>({
    teaching_level: "",
    teaching_subjects: "",
    wilaya: "",
    search: "",
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const teachersList = await fetchTeachers(filters);
        setTeachers(teachersList);
      } catch (err) {
        setError("Failed to fetch teachers");
      }
    };
    loadTeachers();
  }, [filters]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-6 bg-white min-h-screen flex">
      <div className="max-w-7xl mx-auto px-6 py-2">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">قائمة أساتذتنا</h1>
          <p className="text-gray-700">ابحث في قائمة من أفضل الأساتذة في مجالاتهم</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <label htmlFor="teaching_level" className="text-sm font-medium text-gray-700 mb-1">
                الطور الدراسي
              </label>
              <select
                name="teaching_level"
                value={filters.teaching_level}
                onChange={handleChange}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">الكل</option>
                <option value="middle">المتوسط</option>
                <option value="secondary">الثانوي</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="teaching_subjects" className="text-sm font-medium text-gray-700 mb-1">
                المادة الدراسية
              </label>
              <select
                name="teaching_subjects"
                value={filters.teaching_subjects}
                onChange={handleChange}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">الكل</option>
                <option value="math">رياضيات</option>
                <option value="science">علوم</option>
                <option value="english">إنجليزية</option>
                <option value="chemistry">كيمياء</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="search" className="text-sm font-medium text-gray-700 mb-1">
                ابحث بالاسم
              </label>
              <input
                type="text"
                name="search"
                placeholder="ابحث بالاسم"
                value={filters.search}
                onChange={handleChange}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="wilaya" className="text-sm font-medium text-gray-700 mb-1">
                الولاية
              </label>
              <input
                type="text"
                name="wilaya"
                placeholder="ادخل الولاية"
                value={filters.wilaya}
                onChange={handleChange}
                className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {/* Teachers List */}
        <ul className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <Link key={teacher.id} href={`/teachers/${teacher.id}`}>
              <li className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center">
                    <img
                      src={teacher.user.avatar_file}
                      alt={`${teacher.user.first_name} ${teacher.user.last_name}`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {teacher.user.first_name} {teacher.user.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{teacher.teaching_subjects}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-600">
                      {teacher.degree} - {teacher.university}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-gray-600">{teacher.wilaya}</p>
                      <p className="text-lg font-semibold text-sky-600">{teacher.price} دج</p>
                    </div>
                  </div>
                </div>
              </li>
            </Link>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TeacherFilter;