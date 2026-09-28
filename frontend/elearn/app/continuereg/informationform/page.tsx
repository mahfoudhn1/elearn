"use client";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { useRouter, useSearchParams } from "next/navigation";
import axiosClientInstance from "../../lib/axiosInstance";
import Link from "next/link";
import StudentReg from "./studentReg";
import TeacherReg from "./teacherReg";

export default function CompletInformations() {
  const user = useSelector((state: RootState) => state.auth.user);
  const rolestate = useSelector((state: RootState) => state.auth.user?.role);
  const [phone_number, setPhone_number] = useState("");
  const [bio, setBio] = useState("");
  const [teaching_level, setTeaching_level] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [grades, setGrades] = useState([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    if (user?.role === "teacher") return;
    const fetchGrades = async () => {
      const res = await axiosClientInstance.get("/grades/");
      setGrades(res.data);
    };
    fetchGrades();
  }, []);

  const handleSubmit = async (submitData: any) => {
    try {
      const config = { headers: { "Content-Type": "application/json" } };

      if (user?.role === "student") {
        const studentpayload = {
          grade_id: submitData.grade_id,
          field_of_study_id: submitData.field_of_study_id,
          phone_number: submitData.phone_number,
          wilaya: submitData.wilaya,
        };
        const res = await axiosClientInstance.put(`/students/${id}/`, studentpayload, config);
        if (res.data) router.push("/dashboard");
      } else if (user?.role === "teacher") {
        const teacherpayload = {
          teaching_level: submitData.teaching_level,
          bio: submitData.bio,
          teaching_subjects: submitData.teaching_subjects,
          degree: submitData.degree,
          phone_number: submitData.phone_number,
          wilaya: submitData.wilaya,
          university: submitData.university,
        };
        const res = await axiosClientInstance.put(`/teachers/${id}/`, teacherpayload, config);
        if (res.data) router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  if (!rolestate) return <p className="text-center text-gray-900">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Left Section */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-xl border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-3">
            اتمم تسجيل حسابك
          </h1>
          <p className="text-gray-600 text-center mb-8">
            من أجل تجربة أفضل يرجى اتمام معلومات حسابك
          </p>

          {rolestate === "teacher" ? (
            <TeacherReg
              bio={bio}
              setBio={setBio}
              phone_number={phone_number}
              setPhone_number={setPhone_number}
              teaching_level={teaching_level}
              setTeaching_level={setTeaching_level}
              wilaya={wilaya}
              setWilaya={setWilaya}
              onSubmit={handleSubmit}
            />
          ) : rolestate === "student" ? (
            <StudentReg
              phone_number={phone_number}
              setPhone_number={setPhone_number}
              teaching_level={teaching_level}
              setTeaching_level={setTeaching_level}
              wilaya={wilaya}
              setWilaya={setWilaya}
              grades={grades}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className="text-center">
              <Link
                href="/continuereg/role"
                className="text-orange-600 hover:underline"
              >
                قم باختيار نوع الحساب
              </Link>
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
}
