"use client"
import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUniversity, faChalkboardTeacher, faLocationPin } from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../../../store/axiosInstance';
import Sidebar from '../../../components/sidebar';

export interface User {

  first_name: string;
  last_name: string;
  email: string;
  avatar : string;
  profession : string;
  degree : string;
  university : string;
  wilaya : string;
}


interface UserProps {
  params: {
    id: string; // Assuming you're getting an ID from the params to fetch the user
  };
}

const Profile: React.FC<UserProps> = ({ params }) =>{

    const [isPopupVisible, setPopupVisible] = useState(false);
    
    const [user, setUser] = useState<User | null>(null); 
    useEffect(() => {
      const fetchUser = async () => {
        try {
          const response = await axiosInstance.get<User>(`http://localhost:8000/api/teachers/${params.id}/`);
          setUser(response.data);
          console.log(response.data);
          
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
  
      fetchUser();
    }, [params.id]);
  
  
    const handleSubscribe = () => {
      // Logic for subscription
      setPopupVisible(true); // Show the popup after subscription
    };

    const handleClosePopup = () => {
      setPopupVisible(false); // Close the popup
    };

  return (
    <div className='flex flex-row'>
      {/* <div className='w-1/4'>
      <Sidebar/>

      </div> */}
        <div className=" md:p-16 p-8">
      <div className="p-8 bg-white shadow mt-24">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="grid  text-center order-last md:order-first mt-20 md:mt-0">

              <div className='text-center items-center mx-auto '>
                <p className="font-bold text-gray-700 text-xl">89</p>
              <p className="text-gray-400 text-center">عدد الطلبة</p>
            </div>
          </div>
          <div className="relative">
            <div className="w-48 h-48 bg-indigo-100 mx-auto rounded-full shadow-2xl absolute overflow-hidden inset-x-0 top-0 -mt-24 flex items-center justify-center text-indigo-500">
            {user &&
              user.avatar? 
                <img
                  src={`${user.avatar}`}
                  alt="Profile"
                  className=" object-cover rounded-full" // Adjust styles as needed
                />
              : 
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-24 h-24 text-gray-500" // Adjust styles as needed
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            }

            </div>
          </div>

          <div className="space-x-8 flex justify-between mt-32 md:mt-0 md:justify-center">
      <button
        className="text-white py-2 px-4 uppercase rounded bg-blue-400 hover:bg-blue-500 shadow hover:shadow-lg font-medium transition transform hover:-translate-y-0.5"
        onClick={handleSubscribe}
      >
        التسجيل
      </button>
          <button
        className="text-white py-2 px-4 uppercase rounded bg-gray-700 hover:bg-gray-800 shadow hover:shadow-lg font-medium transition transform hover:-translate-y-0.5"
      >
        مراسلة
      </button>
          </div>
        </div>

        <div className="mt-20 text-center  border-b pb-12">
          <div>
            <h1 className="text-4xl font-medium text-gray-700"> <span className="font-light text-gray-dark">الأستاذ: </span>
              {user?.first_name} {user?.last_name} {user?.email}
            </h1>
            
            <p className="font-light text-gray-600 mt-3">
            <FontAwesomeIcon className='w-4 h-4 mx-2 text-gray ' icon={faLocationPin} />

            {user?.wilaya} </p>
          </div>
          <div className='flex flex-col mt-4 space-y-4 justify-center'>
           <div className='text-center flex justify-center '>
            <FontAwesomeIcon className='w-6 h-6 mx-2 text-gray ' icon={faChalkboardTeacher} /> 
            <p className="text-gray-500">أستاذ {user?.profession} </p>
            </div>
            <div className=' text-center flex justify-center '>
            <FontAwesomeIcon className=' w-6 h-6 mx-2 text-gray' icon={faUniversity} /> 
            <p className="text-gray-500">{user?.degree}- {user?.university}</p>
            </div>
          </div>
 
        </div>
   
        <div className="mt-12 flex flex-col justify-center">
          <p className="text-gray-600 text-center font-light lg:px-16">
            قم بالتسجيل لدى الأستاذ فلان الآن واستفد من العديد من المزايا الرائعة!

          </p>
          <p className="text-gray-600 text-center font-light lg:px-16">
            سجل للحصول على ميزة حضور الدروس المقدمة من قبله، وتفاعل مباشرة معها عبر البث المباشر على منصتنا. كما يمكنك الوصول إلى جميع الدروس التي يرفعها الأستاذ بشكل مستمر. اغتنم الفرصة لتطوير مهاراتك وحضور جلسات تعليمية حية ومباشرة.
            </p>
   
        </div>
        {isPopupVisible&&( 
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-lg">
                  <h2 className="text-2xl font-semibold text-gray-800">شكرا على التسجيل!</h2>
                  <p className="mt-4 text-gray-600">شكر على التسجيل, سيتم الاتصال بك لتأكيد تسجيلك .</p>
                  <button
                    onClick={handleClosePopup}
                    className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
                  >
                    اغلاق
                  </button>
                </div>
              </div>
  
        )}


      </div>
      </div>

    </div>
  )
}



export default Profile