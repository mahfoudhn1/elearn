"use client";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Scrollbar, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import axiosClientInstance from "../../../lib/axiosInstance";
import { Student } from "../../../types/student";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store/store";
import { Users } from "lucide-react";

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
    return null; // Don't render if user is not a teacher or there are no requests
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
    <h3 className="text-xl font-semibold text-gray-700 mb-4">
      <Users className="inline-block mr-2" size={20} />
      Student Requests
    </h3>
    <div className="p-6 bg-gray-50 rounded-lg shadow-sm">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">طلبات الانضمام للمجموعة</h1>
      <Swiper
        modules={[Pagination, Scrollbar, A11y]}
        spaceBetween={16}
        slidesPerView={1}
        breakpoints={{
          640: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
          1280: { slidesPerView: 4 },
        }}
        pagination={{ clickable: true }}
        scrollbar={{ draggable: true }}
        className="mySwiper"
      >
        {studentRequests.map((req) => (
          <SwiperSlide key={req.id} className="p-2">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <img
                src={`${req.student.user.avatar_file}`}
                alt={`${req.student.user.first_name} ${req.student.user.last_name}`}
                className="w-20 h-20 rounded-full object-cover mb-4"
              />
              <h2 className="text-lg font-semibold text-gray-800">
                {req.student.user.first_name} {req.student.user.last_name}
              </h2>
              <p className="text-sm text-gray-500 mb-4">{req.student.wilaya}</p>
              <div className="flex gap-4">
                <button
                  className="flex items-center justify-center w-10 h-10 text-green-500 border border-green-500 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                  onClick={() => handleAccepted(req.id)}
                >
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button
                  className="flex items-center justify-center w-10 h-10 text-red-500 border border-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                  onClick={() => handleReject(req.id)}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
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