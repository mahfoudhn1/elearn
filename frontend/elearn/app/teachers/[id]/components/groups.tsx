"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Group } from '../../../types/student';
import axiosClientInstance from '../../../lib/axiosInstance';

interface StudentGroupsProps {
  groups: Group[];
}

interface JoinRequest {
  group_id: number;
  is_accepted: boolean;
  is_rejected: boolean;
}

const TeacherProps: React.FC<StudentGroupsProps> = ({ groups }) => {
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch existing join requests when component mounts
  useEffect(() => {
    const fetchJoinRequests = async () => {
      try {
        const response = await axiosClientInstance.get('groups/teacher-requests/');
        console.log(response.data);
        
        setJoinRequests(response.data);
      } catch (error) {
        console.error("Failed to fetch join requests:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJoinRequests();
  }, []);

  const handleGroup = (id: number) => {
    router.push(`/groups/allgroups/${id}`);
  };

  const handleJoin = async (id: number) => {
    try {
      const res = await axiosClientInstance.post('groups/student-requests/', { group_id: id });
      setSelectedGroupId(id);
      // Add the new request to our state
      setJoinRequests(prev => [...prev, {
        group_id: id,
        is_accepted: false,
        is_rejected: false
      }]);
      setErr("");
      return res;
    } catch (error: any) {
      console.log(error);
      setErr(error.response?.data?.[0] || "An error occurred");
    }
  };

  // Check if student has a pending request for a specific group
  const hasPendingRequest = (groupId: number) => {
    return joinRequests.some(request => 
      request.group_id === groupId && 
      !request.is_accepted && 
      !request.is_rejected
    );
  };

  if (!groups || groups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500 text-lg">لا مجموعات لتخصصك.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">مجموعات الأستاذ</h1>
          <p className="text-gray-600">اختر مجموعة مناسبة لتوقيتك</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const isPending = hasPendingRequest(group.id);
            const requestStatus = joinRequests.find(r => r.group_id === group.id);
            
            return (
              <div
                key={group.id}
                className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer border ${
                  isPending ? 'border-yellow-300' : 'border-gray-200 hover:border-purple-500'
                }`}
                onClick={() => handleGroup(group.id)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{group.name}</h3>
                      <p className="text-gray-600 mb-1">
                        <span className="font-medium">تخصص:</span> {group.field_of_study_nest}
                      </p>
                      <p className="text-gray-600 mb-1">
                        <span className="font-medium">مستوى:</span> {group.school_level}
                      </p>
                    </div>
                    <div className="bg-purple-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {group.students?.length ?? 0} طلبة
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoin(group.id);
                      }}
                      disabled={isPending}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isPending
                          ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isPending 
                        ? requestStatus?.is_accepted 
                          ? 'Accepted' 
                          : requestStatus?.is_rejected 
                            ? 'Rejected' 
                            : 'Request Pending'
                        : 'انظم للمجموعة'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {err && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg">
            <p className="text-red-600 text-sm">{err}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherProps;