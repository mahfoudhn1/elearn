import React from 'react'
import Sidebar from '../../../components/dahsboardcomponents/sidebar';
import Navbar from '../../../components/dahsboardcomponents/navbar';
import { cookies } from 'next/headers';
import Students from './Students';
import axiosSSRInstance from '../../../lib/axiosServer';




interface Params{
    id:number,
    groupId:number
}
async function getStudents(group_id:number){

  try {
    const response = await axiosSSRInstance.get(`/groups/teacher-requests/`, {     
        params: {
          group_id: group_id
        },
      });
    return response.data
    ;
  } catch (error) {
    console.error('Error fetching group data:', error);
  }
}

async function SnigleGrpoup({params} :{params:Params}) {
  
  try{

  const group_id = Number(params.groupId)
  const students = await getStudents(group_id)

  
  return (
    <div className="flex flex-row bg-stone-50">
    <Sidebar />
    <div className="flex flex-col w-full">
      <Navbar />
      <div className="p-4">
        <Students students={students} />
      </div>
    </div>
    </div>
)
  }catch (error) {
    return <p>Error loading groups or students data.</p>; 
  }
  
}

export default SnigleGrpoup