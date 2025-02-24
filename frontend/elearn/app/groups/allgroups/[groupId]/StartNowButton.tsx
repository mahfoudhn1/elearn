"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axiosClientInstance from "../../../lib/axiosInstance";

export default function StartNowButton({ schedules }: { schedules: any[] }) {
  const [showButton, setShowButton] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkSchedule = async () => {
      const now = new Date();

      const activeSchedule = schedules.find(schedule => {
        const startDateTime = new Date(`${schedule.scheduled_date}T${schedule.start_time}`);
        const endDateTime = new Date(`${schedule.scheduled_date}T${schedule.end_time}`);
        return now >= startDateTime && now <= endDateTime;
      });

      if (activeSchedule) {
        setShowButton(true);
        try {
          const response = await axiosClientInstance.get(`/live/`, {
            params: { group_id: activeSchedule.group, scheduled_date: activeSchedule.scheduled_date }
          });

          if (response.data.length > 0) {
            setCurrentMeeting(response.data[0]); // Assuming one meeting per schedule
          }
        } catch (error) {
          console.error("Error fetching meeting:", error);
        }
      } else {
        setShowButton(false);
        setCurrentMeeting(null);
      }
    };

    const interval = setInterval(checkSchedule, 60000);
    checkSchedule(); // Initial check

    return () => clearInterval(interval);
  }, [schedules]);

//   const handleClick = () => {
//     if (currentMeeting) {
//       router.push(`/meeting-room/${currentMeeting.id}`);
//     }
//   };
  console.log(currentMeeting);
  
  if (!showButton || !currentMeeting) return null;

  return (
    <div className="bottom-4 right-4 animate-pulse">
      <button
        // onClick={handleClick}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 transition-all"
      >
        <span className="w-3 h-3 bg-white rounded-full"></span>
        Start Now
      </button>
    </div>
  );
}
