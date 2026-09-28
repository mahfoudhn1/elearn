"use client";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../store/store";
import { CalendarCheck } from "lucide-react";
import Link from "next/link";

interface SchedulebuttonProps {
  id: string;
}

const Schedulebutton = ({ id }: SchedulebuttonProps) => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (user?.role !== "teacher") return null;

  return (
    <Link
      href={`/groups/allgroups/${id}/calender/add`}
      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
    >
      <CalendarCheck className="-ml-1 mr-2 h-5 w-5" />
      <span>اضافة/تعديل توقيت</span>
    </Link>
  );
};

export default Schedulebutton;
