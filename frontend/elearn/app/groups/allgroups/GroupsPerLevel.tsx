'use client';
import { useEffect, useState } from 'react';
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
  groupsCategories?: Group[];
  allGrades: Grade[]
}
interface GradeGroup {
  gradeName: string;
  groups: any[]; // Replace 'any' with your group type if available
}

const GroupsPerLevel = ({ groupsCategories, allGrades }: GroupsPerLevelProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const user = useSelector((state:RootState)=> state.auth.user)


  const searchParams = useSearchParams()
  const school_Level = searchParams.get('school_Level')
  const field = searchParams.get('field')
  const params = useParams()
  const router = useRouter()

  const handleCreatePage = ()=>{
    if (field) {
      router.push(`/groups/allgroups/create/?field=${field}&school_Level=${school_Level}`);
    } else {
      router.push(`/groups/allgroups/create/?school_Level=${school_Level}`);
    }
    
  }
  const handleGroup = (id:number)=>{
    router.push(`/groups/allgroups/${id}`)
  }

  const handleJoin= async (id:number)=>{
    try{
      const res = await axiosInstance.post('groups/student-requests/',{group_id : id})
      
      return res
    }catch(error:any){
      console.log(error);

    }
  }
  const groupedByGrade = allGrades.reduce<Record<number, GradeGroup>>((acc, grade) => {
    const gradeGroups = groupsCategories?.filter(group => group.grade === grade.id);
    acc[grade.id] = {
      gradeName: grade.name,
      groups: gradeGroups || []
    };
    return acc;
  }, {});
  
  

  return (
    <div className="flex flex-row bg-stone-50">
      <Sidebar />
      <div className="flex flex-col w-full">
        <Navbar />
        <div className="p-4">
          <div className="flex md:flex-row justify-between flex-col p-6 mx-4 w-full">
            <h1 className="text-center text-gray-dark text-2xl font-semibold">كل مجموعات التخصص</h1>
            <button 
              className="border-gray border py-2 px-4 rounded-lg text-gray hover:bg-gray-dark hover:text-white"
              onClick={handleCreatePage}
            >
              انشاء مجموعة +
            </button>
          </div>

          {Object.entries(groupedByGrade).map(([gradeId, { gradeName, groups }]) => (
            <div key={gradeId} className="mb-8">
              <h2 className="text-xl font-bold mb-4 px-6">{gradeName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
                {groups.map((group) => (

                  

                  <div key={group.id} 
                  onClick={() => handleGroup(group.id)}
                  className="bg-white rounded-xl p-6 shadow-lg transition cursor-pointer border border-white hover:border-purple transition-al">
                    <div className="p-6">
                      <div className="flex flex-col justify-between items-center text-center cursor-pointer">
                        <div  className="cursor-pointer">
                          <h3 className="text-2xl font-bold text-gray-700">{group.name}</h3>
                        </div>
                        <div className="text-left">
                          <p className="text-sm mt-2 text-sky-400 font-semibold">
                            عدد الطلبة : {group.students?.length ?? 0}
                          </p>
                          <p className="mt-2 text-gray">{group.school_level}</p>
                        </div>
                      </div>
                      
                      {user?.role === "student" && (
                        <div className="mt-4">
                          <button 
                            className="px-4 text-gray-800 border border-gray-800 rounded-lg py-2 bg-white hover:bg-gray-800 hover:text-white transition-colors"
                            onClick={() => handleJoin(group.id)}
                          >
                            Join
                          </button>
                          {errorMessage && <span className="text-red-500 mt-2 block">{errorMessage}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupsPerLevel;
