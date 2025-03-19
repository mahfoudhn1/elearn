"use client"
import { useEffect, useState } from "react";
import { Calendar, ScheduleProfile } from "./AvalibleDahsboard";
import axiosClientInstance from "../../lib/axiosInstance";
import { Schedule } from "../../types/student";


 function AvailabilityDashboard(){

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState<boolean>(false); // Loading state
  
    useEffect(() => {
        fetchSchedules();
    }, [selectedDate]);
  
    const fetchSchedules = async () => {
        setLoading(true); 
        try {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            const response = await axiosClientInstance.get<Schedule[]>(`/groups/schedules/`);
            setSchedules(response.data);
        } catch (error) {
            console.error('Error fetching schedules:', error);
        } finally {
            setLoading(false); 
        }}

        
    return (
      <div className=" flex bg-white">
        <div>
        </div>
        <div className='flex flex-col p-4'>
          <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} schedules={schedules} />
          <ScheduleProfile selectedDate={selectedDate} schedules={schedules} />
  
        </div>
      </div>
    );
  }

  export default AvailabilityDashboard