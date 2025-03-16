"use client"
import React from 'react';
import { Group } from '../../types/student';
import Navbar from '../../components/dahsboardcomponents/navbar';
import Sidebar from '../../components/dahsboardcomponents/sidebar';
import { useRouter } from 'next/navigation';

interface StudentGroupsProps {
  groups: Group[];
}

const StudentGroups: React.FC<StudentGroupsProps> = ({ groups }) => {
    const router = useRouter()
    const handleGroup = (id:number)=>{
        router.push(`/groups/allgroups/${id}`)
      }
    
    if (!groups || groups.length === 0) {
    return <p>You are not subscribed to any groups.</p>;
  }

  return (
    <div className="flex flex-row bg-stone-50">
    <Sidebar />
    <div className="flex flex-col w-full">
      <Navbar />
      <div className="p-4">
        <div className="flex md:flex-row justify-between flex-col p-6 mx-4 w-full">
          <h1 className="text-center text-gray-dark text-2xl font-semibold">كل مجموعات التخصص</h1>

        </div>

          <div  className="mb-8">
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
                      
                    </div>
                  </div>
                ))}
              </div>
          </div>
      </div>
    </div>
  </div>
);
};



export default StudentGroups;
