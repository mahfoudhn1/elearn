"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useSelector } from "react-redux";
import { RootState } from "../../../../store/store";

import { Video } from "lucide-react";

interface MeetingRef {
  id: string;
}

export default function StartNowButton({ schedules }: { schedules: any[] }) {
  const [showButton, setShowButton] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<MeetingRef | null>(null);
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const checkSchedule = async () => {
      const now = new Date();

      const activeSchedule = schedules.find(schedule => {
        const startDateTime = new Date(`${schedule.scheduled_date}T${schedule.start_time}`);
        const endDateTime = new Date(`${schedule.scheduled_date}T${schedule.end_time}`);
        return now >= startDateTime && now <= endDateTime;
      });

      if (activeSchedule && activeSchedule.Meeting) {
        setShowButton(true);
        setCurrentMeeting(activeSchedule.Meeting);
      } else {
        setShowButton(false);
        setCurrentMeeting(null);
      }
    };

    const interval = setInterval(checkSchedule, 60000);
    checkSchedule(); // Initial check

    return () => clearInterval(interval);
  }, [schedules]);

  const handleClick = () => {
    if (currentMeeting) {
      router.push(`/lives?roomId=${currentMeeting.id}`);
    }
  };
  
  if (!showButton || !currentMeeting) return null;

  return (
    <div className="animate-pulse">
      <button
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
        onClick={handleClick}
      >
        <Video className="-ml-1 mr-2 h-5 w-5" />
        {user?.role !== "student" ? (
          <span>بدء البث</span>
        ) : (
          <span>الدخول الى البث</span> 
        )}
      </button>
    </div>
  );
}
