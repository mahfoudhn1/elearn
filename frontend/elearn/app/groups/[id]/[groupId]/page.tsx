import React from 'react'
import Sidebar from '../../../components/dahsboardcomponents/sidebar';
import Navbar from '../../../components/dahsboardcomponents/navbar';
import { cookies } from 'next/headers';
import axiosClientInstance from '../../../lib/axiosInstance';




interface Params{
    id:number,
    groupId:number
}
async function getStudents(group_id:number){
  const cookieStore = cookies();
  const authToken = cookieStore.get('access_token')?.value;

  try {
    const response = await axiosClientInstance.get(`/groups/teacher-requests/`, {
      headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        params: {
          group_id: group_id
        },
        withCredentials: true, // To send cookies
      });
    return response.data;
  } catch (error) {
    console.error('Error fetching group data:', error);
  }
}

function SnigleGrpoup({params} :{params:Params}) {
  console.log(params);
  
  
  const group_id = Number(params.groupId)
  const students = getStudents(group_id)
  console.log(students);
  
  return (
    <div className="flex flex-row bg-stone-50">
    <Sidebar />
    <div className="flex flex-col w-full">
      <Navbar />
      <div className="p-4">
      </div>
    </div>
    </div>
  
)
}

export default SnigleGrpoup