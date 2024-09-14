"use client"
import React, { useEffect, useState } from 'react'
import axiosClientInstance from '../../../lib/axiosInstance';
import { useParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import PopupStudents from './PopupStudents';
import { Student } from '../../../types/student';
import { Subscription } from '../../../types/student';

interface StudentsListProps {
  studentlist: Student[];
}


function StudentsList({studentlist}:StudentsListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isPopupVisible, setPopupVisible] = useState(false);
  const params = useParams() 


  const handleOpenPopup = () => {
      setPopupVisible(true);
    };
  
    // Function to hide the popup
    const handleClosePopup = () => {
      setPopupVisible(false);
    };
  useEffect(() => {
      if (studentlist.length > 0) {
        const fetchSubscriptions = async () => {
          try {
            const studentIds = studentlist.map(student => student.id);

            const response = await axiosClientInstance.post('/subscriptions/filtered_subscribed_students/', {
              student_ids: studentIds
            },
          );

            if (response) {
              const data = await response.data;
              setSubscriptions(data);
            } else {
              console.error('Failed to fetch subscriptions');
            }
          } catch (error) {
            console.error('Error fetching subscriptions:', error);
          }
        };

        fetchSubscriptions();
      }
    }, [studentlist]);


  const handleDelte = async(id:number)=>{
    const groud_id = Number(params.groupId)
    return await axiosClientInstance.delete(`groups/${groud_id}/remove_student/`, {
      data: { student_id: id } 
  });
  }
    

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8 sm:px-8">
       {isPopupVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="relative w-full max-w-lg bg-transparent p-6">
            <PopupStudents onClose={handleClosePopup} />
          </div>
        </div>
      )}
  <div className="flex items-center justify-between pb-6">
    <div>
      <h2 className="font-semibold text-gray-700">أعضاء المجموعة</h2>
    </div>
    <div className="flex items-center justify-between">
        <div className="ml-10 space-x-8 lg:ml-40">
          <button className="flex items-center gap-2 rounded-md bg-sky-400 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring hover:bg-blue"
          onClick={handleOpenPopup}
          >
            <FontAwesomeIcon icon={faPlus} />
            اضافة أعضاء
          </button>
        </div>
      </div>
  </div>
  <div className="overflow-y-hidden rounded-lg border border-gray-light">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-light">
        <thead className="bg-sky-400">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              ID
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              الاسم الكامل
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              الاشتراك
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              الولاية
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
              
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray">
          {studentlist?.map((student, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray">
                {student.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <img className="h-10 w-10 rounded-full"   
                    src={`http://localhost:8000${student.avatar}`}
                    alt="" />
                  </div>
                  <div className="mr-4">
                    <div className="text-sm font-medium">
                      {student.first_name} {student.last_name}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {subscriptions.find(s => s.student === student.id)?.is_active ? 
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-300 text-green-800">
                Active
                </span> 
                  : 
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-300 text-red-800">
                  not active
                </span>
                  
                  }
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {student.wilaya}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button className="px-2 inline-flex text-sm  py-1 font-semibold border border-red-300 rounded-lg text-red-800 hover:text-white hover:bg-red-500 hover:border-red-800  "
                onClick={()=>handleDelte(student.id)}
                >
                  حذف 
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
</div>

  )
}

export default StudentsList