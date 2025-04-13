"use client";
import React, { useState, useEffect, ChangeEvent, useCallback } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { RootState } from "../../store/store";
import axiosClientInstance from "../lib/axiosInstance";
import { Teacher } from "../types/student";

interface Filters {
  teaching_level: string;
  teaching_subjects: string;
  wilaya: string;
  search: string;
}

const TEACHING_SUBJECTS = {
  رياضيات: ["رياضيات"],
  فيزياء: ["فيزياء"],
  كيمياء: ["كيمياء"],
  أحياء: ["أحياء"],
  فرنسية: ["فرنسية"],
  عربية: ["عربية"],
  إنجليزية: ["إنجليزية"],
  تاريخ: ["تاريخ"],
  جغرافيا: ["جغرافيا"],
  فلسفة: ["فلسفة"],
  اقتصاد: ["اقتصاد"],
};

const TEACHING_LEVELS = {
  PRIMARY: ["PRIMARY", "ابتدائي"],
  MIDDLE: ["MIDDLE", "متوسط"],
  SECONDARY: ["SECONDARY", "ثانوي"],
  HIGHER: ["HIGHER", "تعليم حر"],
};

const fetchTeachers = async (page: number, pageSize: number): Promise<{ teachers: Teacher[], total: number }> => {
  try {
    const response = await axiosClientInstance.get(`/teachers/?page=${page}&page_size=${pageSize}`);
    return {
      teachers: response.data.results || response.data, // Adjust based on API response structure
      total: response.data.count || response.data.length, // Adjust based on API response
    };
  } catch (error) {
    throw new Error("Failed to fetch teachers");
  }
};

const TeacherFilter: React.FC = () => {
  const searchParams = useSearchParams();
  const user = useSelector((state: RootState) => state.auth.user);
  const [filters, setFilters] = useState<Filters>({
    teaching_level: searchParams.get("teaching_level") || "",
    teaching_subjects: "",
    wilaya: "",
    search: "",
  });
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const pageSize = 9; // Number of teachers per page

  // Fetch teachers
  const loadTeachers = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const { teachers, total } = await fetchTeachers(page, pageSize);
      setAllTeachers((prev) => [...prev, ...teachers]);
      setHasMore(allTeachers.length + teachers.length < total);
      setPage((prev) => prev + 1);
      setError(null);
    } catch (err) {
      setError("تعذر جلب قائمة الأساتذة");
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, loading, allTeachers.length]);

  // Initial fetch
  useEffect(() => {
    loadTeachers();
  }, []);

  // Client-side filtering
  useEffect(() => {
    const filtered = allTeachers.filter((teacher) => {
      const matchesLevel = filters.teaching_level
        ? teacher.teaching_level === filters.teaching_level
        : true;
      const matchesSubject = filters.teaching_subjects
        ? teacher.teaching_subjects.includes(filters.teaching_subjects)
        : true;
      const matchesWilaya = filters.wilaya
        ? teacher.wilaya.toLowerCase().includes(filters.wilaya.toLowerCase())
        : true;
      const matchesSearch = filters.search
        ? `${teacher.user.first_name} ${teacher.user.last_name}`
            .toLowerCase()
            .includes(filters.search.toLowerCase())
        : true;
      return matchesLevel && matchesSubject && matchesWilaya && matchesSearch;
    });
    setFilteredTeachers(filtered);
  }, [filters, allTeachers]);

  // Handle scroll for pagination
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 100 &&
        hasMore &&
        !loading
      ) {
        loadTeachers();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, loadTeachers]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const resetFilters = () => {
    setFilters({
      teaching_level: "",
      teaching_subjects: "",
      wilaya: "",
      search: "",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
            اكتشف أفضل الأساتذة
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            ابحث عن أساتذة متخصصين في مختلف التخصصات والمستويات التعليمية بسرعة وسهولة
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative">
              <label htmlFor="teaching_level" className="block text-sm font-semibold text-gray-700 mb-2">
                الطور الدراسي
              </label>
              <select
                name="teaching_level"
                value={filters.teaching_level}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all appearance-none"
              >
                <option value="">كل المستويات</option>
                {Object.entries(TEACHING_LEVELS).map(([key, [, display]]) => (
                  <option key={key} value={key}>
                    {display}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <label htmlFor="teaching_subjects" className="block text-sm font-semibold text-gray-700 mb2">
                المادة الدراسية
              </label>
              <select
                name="teaching_subjects"
                value={filters.teaching_subjects}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all appearance-none"
              >
                <option value="">كل المواد</option>
                {Object.entries(TEACHING_SUBJECTS).map(([key, [arabic]]) => (
                  <option key={key} value={key}>
                    {arabic}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                البحث بالاسم
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="search"
                  placeholder="ابحث عن أستاذ..."
                  value={filters.search}
                  onChange={handleChange}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pl-12"
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="relative">
              <label htmlFor="wilaya" className="block text-sm font-semibold text-gray-700 mb-2">
                الولاية
              </label>
              <input
                type="text"
                name="wilaya"
                placeholder="أدخل الولاية"
                value={filters.wilaya}
                onChange={handleChange}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-semibold"
            >
              إعادة تعيين
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg mb-12 animate-fade-in">
            {error}
          </div>
        )}

        {/* Teachers List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTeachers.length === 0 && !error && !loading && (
            <div className="col-span-full text-center py-12">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.172 16.172a4 4 0 015.656 0M12 12a4 4 0 100-8 4 4 0 000 8zM5 20h14"
                />
              </svg>
              <p className="text-lg text-gray-500">لا يوجد أساتذة مطابقون حاليًا</p>
            </div>
          )}
          {filteredTeachers.map((teacher) => (
            <Link key={teacher.id} href={`/teachers/${teacher.id}`}>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
                <div className="p-6">
                  <div className="flex items-center">
                    <img
                      src={teacher.user.avatar_file || "/default-avatar.png"}
                      alt={`${teacher.user.first_name} ${teacher.user.last_name}`}
                      className="w-20 h-20 rounded-full object-cover border-4 border-blue-100"
                    />
                    <div className="mr-4 flex-1">
                      <h3 className="text-xl font-bold text-gray-900">
                        {teacher.user.first_name} {teacher.user.last_name}
                      </h3>
                      <p className="text-sm text-blue-600 font-medium">{teacher.teaching_subjects}</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 14l9-5-9-5-9 5 9 5z"
                        />
                      </svg>
                      <span className="text-sm">
                        {teacher.degree} - {teacher.university}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                      </svg>
                      <span className="text-sm">{teacher.wilaya}</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <span className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors">
                      عرض الملف الشخصي
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="col-span-full text-center py-8">
            <svg
              className="animate-spin w-8 h-8 mx-auto text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="mt-2 text-gray-600">جاري تحميل الأساتذة...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherFilter;