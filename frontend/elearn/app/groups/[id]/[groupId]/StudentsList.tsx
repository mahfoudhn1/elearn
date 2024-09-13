"use client"
import React, { useEffect, useState } from 'react'
import axiosClientInstance from '../../../lib/axiosInstance';
import { useParams } from 'next/navigation';

interface Student{
    id:number;
    first_name:string;
    last_name : string;
    avatar : string;
    wilaya:string;
  }
interface StudentsListProps {
  studentlist: Student[];
}

interface Subscription {
  id: number;
  student: number;
  is_active:boolean;
}
  


function StudentsList({studentlist}:StudentsListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const params = useParams() 

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
  <div className="flex items-center justify-between pb-6">
    <div>
      <h2 className="font-semibold text-gray-700">أعضاء المجموعة</h2>
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
        <tbody className="bg-white divide-y divide-gray-200">
          {studentlist?.map((student, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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