"use client";
import React, { useEffect, useState } from "react";
import StudentsRequest from "./Studentsreq";
import StudentsList from "./StudentsList";
import ScheduleList from "./calender/add/List";
import {
  CalendarCheck,
  MessageCircleMore,
  Users,
  Video,
} from "lucide-react";
import Schedulebutton from "./Schedulebutton";
import DeleteButton from "./DeleteButton";
import StartNowButton from "./StartNowButton";
import axiosClientInstance from "../../../lib/axiosInstance";
import PinnedMessages from "./PinnedMessage";
import GroupVideoUpload from "./Videoupload";
import GroupVideo from "./videoplayer";

interface Params {
  id: string;
}

async function fetchGroupData(group_id: string) {
  try {
    const [studentsReq, groupData, schedules] = await Promise.all([
      axiosClientInstance.get(`/groups/teacher-requests/`, {
        params: { group_id },
      }),
      axiosClientInstance.get(`/groups/${group_id}/`),
      axiosClientInstance.get(`/groups/schedules/`, { params: { group_id } }),
    ]);
    return {
      studentsReq: studentsReq.data,
      group: groupData.data,
      schedules: schedules.data,
    };
  } catch (error) {
    console.error("Error fetching group data:", error);
    throw error;
  }
}

function SingleGroupPage({ params }: { params: Params }) {
  const [data, setData] = useState<{
    studentsReq: any;
    group: any;
    schedules: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshData = () => {
    const group_id = String(params.id);
    fetchGroupData(group_id)
      .then((result) => setData(result))
      .catch(() => setError("Error loading groups or students data."));
  };

  useEffect(() => {
    refreshData();
  }, [params.id]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading...
      </div>
    );
  }

  const { studentsReq, group, schedules } = data;
  const { students, admin, name } = group;

  return (
    <div className="bg-gray-100 min-h-screen md:w-[95%] w-full md:mr-[5%] mr-0">
      <main className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              {admin?.avatar_file && (
                <img
                  src={admin.avatar_file}
                  alt={admin.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-md"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-grey-900">{name}</h1>
                <p className="text-sm text-gray-600">
                  مدير المجموعة: <span className="font-medium">{admin?.name}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StartNowButton schedules={schedules} />
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-grey-900 flex items-center mb-4">
                <MessageCircleMore className="mr-2 text-orange-600" size={24} />
                اعلانات مثبته 
              </h3>
              <PinnedMessages groupId={params.id} />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-grey-900 flex items-center">
                  <CalendarCheck className="mr-2 text-orange-600" size={24} />
                  التوقيت
                </h3>
                <Schedulebutton id={params.id} />
              </div>
              <ScheduleList schedules={schedules} />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-grey-900 flex items-center mb-4">
                <Video className="mr-2 text-orange-600" size={24} />
                درس سابق
              </h3>
               <GroupVideo groupId={params.id} /> 
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-grey-900 flex items-center mb-4">
                طلبات الانظمام
              </h3>
              <StudentsRequest studentsreqroup={studentsReq} />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-grey-900 flex items-center mb-4">
                <Video className="mr-2 text-orange-600" size={24} />
                رفع فيديو
              </h3>
              <GroupVideoUpload groupId={params.id} onUploadComplete={refreshData} />
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-grey-900 flex items-center mb-4">
                <Users className="mr-2 text-orange-600" size={24} />
                الطلبة
              </h3>
              <StudentsList studentlist={students} refreshData={refreshData} />
            </div>
            
          </div>
              <div className="flex items-center space-x-2">

              <DeleteButton groupId={params.id} />
            </div>
        </div>
      </main>
    </div>
  );
}

export default SingleGroupPage;