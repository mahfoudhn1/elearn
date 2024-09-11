"use client"
import React from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css'
import 'swiper/swiper-bundle.css'
import { Navigation, Pagination, Scrollbar, A11y, Autoplay } from 'swiper/modules';
import { faCheck, faCheckCircle, faXmark } from '@fortawesome/free-solid-svg-icons';
import axiosClientInstance from '../../../lib/axiosInstance';
interface Student{
    first_name: string
    avatar:string ;
    last_name:string ;
    wilaya:string ;

}
interface Students{
    students:Student[]
}
function StudentsRequest({ students }: Students) {
  const handleAccpted = async()=>{
    return await axiosClientInstance.post('/groups/teacher-requests/',{accept:true},{
      withCredentials : true
    })
  } 
  const handleReject = async()=>{
    return await axiosClientInstance.post('/groups/teacher-requests/',{accept:false},{
      withCredentials : true
    })
  } 
  return (
    <div className='p-10'>
        <h1>Students request list</h1>
        <Swiper
        modules={[Pagination, Scrollbar, A11y, Autoplay]}
        spaceBetween={50}
        slidesPerView={1}
        
        autoplay
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

            {students?.map((student, index) => (
            <SwiperSlide key={index}
            className='p-4'
            >
            <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md max-w-xs">
            <img
                src={`http://localhost:8000${student.avatar}`} 
                alt={`${student.first_name} ${student.last_name}`}
                className="w-24 h-24 rounded-full object-cover mb-4"
            />
            <h2 className="text-lg font-semibold">{student.first_name} {student.last_name}</h2>
            <p className="text-gray-500">{student.wilaya}</p>
            <div className="flex mt-4 justify-between ">
                <button className="flex items-center mx-2 cursor-pointer justify-center w-10 h-10 text-gray border rounded-full hover:text-white hover:bg-sky-400">
                    <FontAwesomeIcon icon={faCheck} 
                  onClick={handleAccpted}
                    />
                </button>
                <button className="flex items-center mx-2 cursor-pointer justify-center w-10 h-10 text-gray border rounded-full hover:text-white hover:bg-red-500">
                    <FontAwesomeIcon icon={faXmark} 
                    onClick={handleReject}
                    />
                </button>
            </div>
        </div>
            </SwiperSlide>
            ))}
    </Swiper>
    </div>
  )
}

export default StudentsRequest