'use client';
import { useState } from 'react';
import Sidebar from '../../components/dahsboardcomponents/sidebar';
import Navbar from '../../components/dahsboardcomponents/navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDownWideShort } from '@fortawesome/free-solid-svg-icons';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import axiosInstance from '../../lib/axiosInstance';
import { Student } from '../../types/student';
import { Group } from '../../types/student';
import { Grade } from '../../types/student';

interface GroupsPerLevelProps {
  groupsCategories: Group[];
  allGrades: Grade[]
}


const GroupsPerLevel = ({ groupsCategories, allGrades }: GroupsPerLevelProps) => {
  const [openGroupId, setOpenGroupId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const user = useSelector((state:RootState)=> state.auth.user)

  const handleDropdown = (groupId: number) => {
    setOpenGroupId((prevId) => (prevId === groupId ? null : groupId));
  };
  const searchParams = useSearchParams()
  const school_Level = searchParams.get('school_Level')
  const params = useParams()
  const router = useRouter()

  const handleCreatePage = ()=>{
    router.push(`/groups/${params.id}/create?school_Level=${school_Level}`);
  }
  const handleGroup = (id:number)=>{
    router.push(`/groups/${params.id}/${id}`)
  }

  const handleJoin= async (id:number)=>{
    try{
      const res = await axiosInstance.post('groups/student-requests/',{group_id : id})
      
      return res
    }catch(error:any){
      console.log(error);
      
      // if (error) {
      //   console.log(error);
        
      //   // setErrorMessage(error.response);
      // } else {
      //   setErrorMessage("An unexpected error occurred.");
      // }
    }
  }
  


  return (
    <div className="flex flex-row bg-stone-50">
      <Sidebar />
      <div className="flex flex-col w-full">
        <Navbar />
        <div className="p-4">
          <div className='flex md:flex-row justify-between flex-col p-6 mx-4 w-full '>
            <h1 className="text-center text-gray-dark text-2xl font-semibold">كل مجموعات التخصص</h1>
            <button className='border-gray border-1 border py-2 px-4 rounded-lg text-gray hover:bg-gray-dark hover:text-white'
              onClick={handleCreatePage}
            > انشاء مجموعة + </button>
          </div>
          <ul>
            {groupsCategories?.map((group) => (
              <li key={group.id}>
                <div className='flex flex-row justify-between'>
           
                </div>
                <div className="max-w-md flex-col cursor-pointer mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl m-5">
                  <div className="p-8 flex justify-between">
                    
                    <div className="pl-4"
                    onClick={()=>handleGroup(group.id)}
                    >
                      <p className="md:text-4xl text-lg font-bold text-gray-700"> {group.name} </p>
                    </div>
                    <div>
                      <div className="uppercase tracking-wide text-sm text-sky-400 font-semibold">
                        {' '}
                        عدد الطلبة : {group.students?.length ?? 0}{' '}
                      </div>
                      <p className="mt-2 text-gray"> {allGrades.find(g => g.id === group.grade)?.name || "Grade not found"} </p>
                      <p className="mt-2 text-gray"> {group.school_level} </p>
                    </div>
                    <div className='flex flex-col'>
                  {user?.role == "student" && 
                  <div>
                  <button className='px-4 float-end text-gray-800 border border-1 border-gray-800 rounded-lg py-2 bg-white hover:bg-gray-800 hover:text-white transition-colors delay-25'
                      onClick={()=>handleJoin(group.id)}
                    > 
                      Join 
                    </button>
                  </div>
                  }
                  <div>
                    {errorMessage && <span className="text-red-500">{errorMessage}</span>}
                  </div>
                </div>
                  </div>
                  {openGroupId === group.id && (
                    <div className="p-4">
                      <h2 className="text-lg font-semibold text-gray-800 ">التوقيت الأسبوعي</h2>
                      <ul>
                        {group.schedule && group.schedule.length > 0 ? (
                          group.schedule.map((schedule, index) => (
                            <li key={index} className="mt-2 text-gray-600">
                              <span className="font-medium text-gray ">{schedule.day_of_week}: </span>
                              {schedule.start_time} - {schedule.end_time}
                            </li>
                          ))
                        ) : (
                          <p className="text-gray-500">No schedule available.</p>
                        )}
                      </ul>
                    </div>
                  )}

                  <div
                    className="flex flex-row justify-center bg-gray bg-opacity-30 items-center mx-auto p-1"
                    onClick={() => handleDropdown(group.id)}
                  >
                    <p className="text-center text-gray ">
                      {' '}
                      التوقيت الاسبوعي
                      <span>
                        {' '}
                        <FontAwesomeIcon className=" " icon={faArrowDownWideShort} />
                      </span>
                    </p>
                  </div>
                </div>

              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GroupsPerLevel;
