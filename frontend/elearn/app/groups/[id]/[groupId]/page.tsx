import React from 'react'
import Sidebar from '../../../components/dahsboardcomponents/sidebar';
import axiosSSRInstance from '../../../lib/axiosServer';
import StudentsRequest from './Studentsreq';
import StudentsList from './StudentsList';




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
async function getGroupStudents(group_id:number){

  try {
    const response = await axiosSSRInstance.get(`/groups/${group_id}/`, {
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
  const StudentsReqGroup = await getStudents(group_id)
  const {students} = await getGroupStudents(group_id)
  console.log(students);
  
  
  return (
    <div className="flex flex-row bg-stone-50">
    <Sidebar />
    <div className="flex flex-col w-full">
      <div className="p-4 flex flex-col">
      <StudentsRequest studentsreqroup={StudentsReqGroup} />
      <StudentsList studentlist={students} />
      </div>
    </div>
    </div>
)
  }catch (error) {
    return <p>Error loading groups or students data.</p>; 
  }
  
}

export default SnigleGrpoup