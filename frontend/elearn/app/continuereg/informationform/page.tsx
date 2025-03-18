"use client";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { useRouter, useSearchParams } from "next/navigation";
import axiosClientInstance from "../../lib/axiosInstance";

import Link from "next/link";
import StudentReg from "./studentReg";
import TeacherReg from "./teacherReg";
import { set } from "lodash";

function CompletInformations() {
  const user = useSelector((state: RootState) => state.auth.user);
  const rolestate = useSelector((state: RootState) => state.auth.user?.role);
  const [phone_number, setPhone_number] = useState("");
  const [bio, setBio]=  useState('')
  const [teaching_level, setTeaching_level] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [grades, setGrades] = useState([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    if (user?.role === 'teacher') {
      return;
    }
    const fetchGrades = async () => {
      const res = await axiosClientInstance.get("/grades/");
      console.log(res.data);
      
      setGrades(res.data);
    };
    fetchGrades();
  }, []);


  const handleSubmit = async (submitData: any) => {
    try {
      // Prepare the payload for the backend
 

  
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      
      if (user?.role === "student") {
        const studentpayload = {
          grade_id: submitData.grade_id,
          field_of_study_id: submitData.field_of_study_id,
          phone_number: submitData.phone_number,
          wilaya: submitData.wilaya,
        };
        const response = await axiosClientInstance.put(`/students/${id}/`, studentpayload, config);
        if(response.data){
          router.push('/dashboard')
        }

      } else if (user?.role === "teacher") {
        const teacherpayload = {
          teaching_level:submitData.teaching_level,
          bio : submitData.bio,
          teaching_subjects: submitData.teaching_subjects,
          degree: submitData.degree,
          phone_number: submitData.phone_number,
          wilaya: submitData.wilaya,
          university: submitData.university,
        };
        const response = await axiosClientInstance.put(`/teachers/${id}/`, teacherpayload, config);
        if(response.data){
          router.push('/dashboard')
        }

      }
      router.push("/dashboard");
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };
  
  if (!rolestate) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <div className="flex md:px-10 md:py-10">
        <div className="w-full bg-white lg:w-1/2 flex items-center justify-center">
          <div className="max-w-md w-full p-6">
            <h1 className="text-3xl font-semibold mb-6 text-black text-center">
              اتمم تسجيل حسابك
            </h1>
            <h1 className="text-sm font-semibold mb-6 text-gray text-center">
              من أجل تجربة أفضل يرجى اتمام معلومات حسابك
            </h1>

            {rolestate === "teacher" ? (
              <TeacherReg
                bio = {bio}
                setBio = {setBio}
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
              <div>
                <Link href={"/continuereg/role"}>قم باختيار نوع الحساب</Link>
              </div>
            )}
          </div>
        </div>
        <div className="hidden lg:flex items-center justify-center flex-1 bg-white text-black">
          <div className="max-w-md w-full text-center">
            <img className="w-full" src="/human.png" alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompletInformations;