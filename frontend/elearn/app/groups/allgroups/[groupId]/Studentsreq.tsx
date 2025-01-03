"use client"
import React, { useEffect, useState } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css'
import 'swiper/swiper-bundle.css'
import { Navigation, Pagination, Scrollbar, A11y, Autoplay } from 'swiper/modules';
import { faCheck, faCheckCircle, faXmark } from '@fortawesome/free-solid-svg-icons';
import axiosClientInstance from '../../../lib/axiosInstance';
import { Student } from '../../../types/student';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store/store';



interface StudentReq{
    id: number
    group:number;
    student:Student;
}
interface StudentsRequestProps {
  studentsreqroup: StudentReq[];
}

function StudentsRequest({ studentsreqroup }: StudentsRequestProps) {

  const [studentRequests, setStudentRequests] = useState<StudentReq[]>(studentsreqroup);
  const user = useSelector((state:RootState) => state.auth.user )

  useEffect(() => {
    setStudentRequests(studentsreqroup);
  }, [studentsreqroup]);

  const handleAccepted = async (id: number) => {
    try {
      await axiosClientInstance.put(`/groups/student-requests/${id}/`, { accept: true }, {
        withCredentials: true,
      });
 
      setStudentRequests((prevRequests) => prevRequests.filter(request => request.id !== id));
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await axiosClientInstance.put(`/groups/student-requests/${id}/`, { reject: true }, {
        withCredentials: true,
      });
      // Update the state to remove the rejected request
      setStudentRequests((prevRequests) => prevRequests.filter(request => request.id !== id));
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };


  return (
    <>
    
    {user?.role === "teacher" &&
      
      <div className='p-10'>
        <h1>طلبات الأنظمام للمجموعة</h1>
        <Swiper
        modules={[Pagination, Scrollbar, A11y]}
        spaceBetween={0}
        slidesPerView={1}
        breakpoints={{
          640: {
            slidesPerView: 1,
          },
          768: {
            slidesPerView: 2,
          },
          1024: {
            slidesPerView: 4,
          },
          1280: {
            slidesPerView: 4,
          },
        }}
        className="mySwiper"
      >

            {studentRequests?.map((req, index) => (
            <SwiperSlide key={index}
            className='p-4'
            >
            <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md max-w-xs">
            <img
                src={`http://localhost:8000${req.student.avatar}`} 
                alt={`${req.student.first_name} ${req.student.last_name}`}
                className="w-24 h-24 rounded-full object-cover mb-4"
            />
            <h2 className="text-lg font-semibold">{req.student.first_name} {req.student.last_name}</h2>
            <p className="text-gray-500">{req.student.wilaya}</p>
            <div className="flex mt-4 justify-between ">
                <button className="flex items-center mx-2 cursor-pointer justify-center w-10 h-10 text-gray border rounded-full hover:text-white hover:bg-sky-400">
                    <FontAwesomeIcon icon={faCheck} 
                  onClick={()=>handleAccepted(req.id)}
                    />
                </button>
                <button className="flex items-center mx-2 cursor-pointer justify-center w-10 h-10 text-gray border rounded-full hover:text-white hover:bg-red-500">
                    <FontAwesomeIcon icon={faXmark} 
                    onClick={()=>handleReject(req.id)}
                    />
                </button>
            </div>
        </div>
            </SwiperSlide>
            ))}
    </Swiper>
    </div>
}
</> 
  )
}

export default StudentsRequest