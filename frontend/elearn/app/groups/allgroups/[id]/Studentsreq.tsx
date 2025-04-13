"use client";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark, faUser } from "@fortawesome/free-solid-svg-icons";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Scrollbar, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import axiosClientInstance from "../../../lib/axiosInstance";
import { Student } from "../../../types/student";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store/store";

interface StudentReq {
  id: number;
  group: number;
  student: Student;
}

interface StudentsRequestProps {
  studentsreqroup: StudentReq[];
}

function StudentsRequest({ studentsreqroup }: StudentsRequestProps) {
  const [studentRequests, setStudentRequests] = useState<StudentReq[]>(studentsreqroup);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    setStudentRequests(studentsreqroup);
  }, [studentsreqroup]);

  const handleAccepted = async (id: number) => {
    try {
      await axiosClientInstance.put(
        `/groups/student-requests/${id}/`,
        { accept: true },
        { withCredentials: true }
      );
      setStudentRequests((prevRequests) => prevRequests.filter((request) => request.id !== id));
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await axiosClientInstance.put(
        `/groups/student-requests/${id}/`,
        { reject: true },
        { withCredentials: true }
      );
      setStudentRequests((prevRequests) => prevRequests.filter((request) => request.id !== id));
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  if (user?.role !== "teacher" || studentRequests.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600 mr-4">
            <FontAwesomeIcon icon={faUser} className="text-lg" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">طلبات الانظمام</h2>
            <p className="text-sm text-gray-500">{studentRequests.length} طلب انظمام للمجموعة</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Swiper
          modules={[Pagination, Scrollbar, A11y]}
          spaceBetween={20}
          slidesPerView={1}
          breakpoints={{
            640: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
          }}
          pagination={{ clickable: true }}
          className="!pb-10"
        >
          {studentRequests.map((req) => (
            <SwiperSlide key={req.id}>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                      {req.student.user.first_name.charAt(0)}
                      {req.student.user.last_name.charAt(0)}
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900">
                    {req.student.user.first_name} {req.student.user.last_name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{req.student.wilaya}</p>
                  
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => handleAccepted(req.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                      <FontAwesomeIcon icon={faCheck} className="text-sm" />
                      <span>قبول</span>
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                    >
                      <FontAwesomeIcon icon={faXmark} className="text-sm" />
                      <span>رفض</span>
                    </button>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

export default StudentsRequest;