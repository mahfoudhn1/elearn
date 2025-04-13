"use client";
import React, { useEffect, useState } from "react";
import Sidebar from "../../../components/dahsboardcomponents/sidebar";
import StudentsRequest from "./Studentsreq";
import StudentsList from "./StudentsList";
import ScheduleList from "./calender/add/List";
import { CalendarCheck, Users } from "lucide-react";
import Schedulebutton from "./Schedulebutton";
import DeleteButton from "./DeleteButton";
import StartNowButton from "./StartNowButton";
import axiosClientInstance from "../../../lib/axiosInstance";

interface Params {
  id: number;
}

async function fetchGroupData(group_id: number) {
  try {
    const [studentsReq, groupData, schedules] = await Promise.all([
      axiosClientInstance.get(`/groups/teacher-requests/`, { params: { group_id } }),
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

function SnigleGrpoup({ params }: { params: Params }) {
  const [data, setData] = useState<{
    studentsReq: any;
    group: any;
    schedules: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const group_id = Number(params.id);
    fetchGroupData(group_id)
      .then((result) => setData(result))
      .catch(() => setError("Error loading groups or students data."));
  }, [params.id]);

  if (error) {
    return <p className="text-red-500 p-8">{error}</p>;
  }

  if (!data) {
    return <p className="p-8">Loading...</p>; // Add a loading state
  }

  const { studentsReq, group, schedules } = data;
  const { students, admin, name } = group;

  return (
    <div className="flex flex-row bg-gray-50 min-h-screen">
      
      <div className="flex flex-col w-full p-8">
        {/* Group Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{name}</h1>
          <div className="flex ">
            <div className="mx-4">
            <StartNowButton schedules={schedules} />
            </div>
            <DeleteButton groupId={params.id} />
          </div>
        </div>

        {/* Admin Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            <Users className="inline-block mr-2" size={20} />
            Group Admin
          </h3>
          <p className="text-gray-600">{admin.name}</p>
        </div>

        {/* Student Requests */}
        <StudentsRequest studentsreqroup={studentsReq} />

        {/* Schedule Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700">
              <CalendarCheck className="inline-block mr-2" size={20} />
              Schedules
            </h3>
            <Schedulebutton id={params.id} />
          </div>
          <ScheduleList schedules={schedules} />
        </div>

        {/* Students List */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            <Users className="inline-block mr-2" size={20} />
            Students
          </h3>
          <StudentsList studentlist={students} />
        </div>
      </div>
    </div>
  );
}

export default SnigleGrpoup;