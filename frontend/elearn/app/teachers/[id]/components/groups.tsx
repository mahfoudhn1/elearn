"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Group } from '../../../types/student';
import axiosClientInstance from '../../../lib/axiosInstance';

interface StudentGroupsProps {
  groups: Group[];
}

const TeacherProps: React.FC<StudentGroupsProps> = ({ groups }) => {
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const handleGroup = (id: number) => {
    router.push(`/groups/allgroups/${id}`);
  };

  const handleJoin = async (id: number) => {
    try {
      const res = await axiosClientInstance.post('groups/student-requests/', { group_id: id });
      setSelectedGroupId(id);
      console.log(selectedGroupId);
      
      return res;
    } catch (error: any) {
      console.log(error);
    }
  };

  if (!groups || groups.length === 0) {
    return <p>You are not subscribed to any groups.</p>;
  }

  return (
    <div className="flex flex-row bg-stone-50">
      <div className="flex flex-col w-full">
        <div className="p-4">
          <div className="flex md:flex-row justify-between flex-col p-6 mx-4 w-full">
            <h1 className="text-center text-gray-dark text-2xl font-semibold">مجموعات الاستاذ حسب تخصصك</h1>
          </div>

          <div className="mb-8">
            <div className="flex flex-col space-y-4 px-4">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => handleGroup(group.id)}
                  className={`bg-white rounded-xl p-6 shadow-lg transition cursor-pointer border ${
                    selectedGroupId === group.id ? 'border-purple' : 'border-white'
                  } hover:border-purple transition-all`}
                >
                  <div className="p-6 flex justify-between items-center text-center cursor-pointer">
                    {/* <div className="flex justify-between items-center text-center cursor-pointer"> */}
                      <div className="cursor-pointer">
                        <h3 className="text-2xl font-bold text-gray-700">{group.name}</h3>
                      </div>
                      <div className="text-left">
                        <p className="text-sm mt-2 text-sky-400 font-semibold">
                          عدد الطلبة : {group.students?.length ?? 0}
                        </p>
                        <p className="mt-2 text-gray">{group.school_level}</p>
                      </div>
                    {/* </div> */}
                    <div className="mt-4">
                      <button
                        className={`px-4 text-gray-800 border border-gray-800 rounded-lg py-2 ${
                          selectedGroupId === group.id ? 'bg-gray-800 text-white' : 'bg-white'
                        } hover:bg-gray-800 hover:text-white transition-colors`}
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleJoin(group.id);
                        }}
                      >
                        Join
                      </button>
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

export default TeacherProps;