"use client"
import React, { useEffect, useState } from 'react';
import { format, addDays, isToday, isSameDay, parseISO, isValid } from 'date-fns';
import { ar } from 'date-fns/locale'; 
import axiosClientInstance from '../../lib/axiosInstance';
import { Group, Schedule } from '../../types/student';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  schedules: Schedule[];

}

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect, schedules }) => {
  const currentDate = new Date();
  const days = Array.from({ length: 20 }, (_, i) => addDays(currentDate, i - 9));


  return (
    <div className="mb-8">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-2xl font-bold">الجدول</h2> 
    <div className="flex items-center">
      <select className="border border-gray rounded-md ml-4 px-3 py-2 bg-white">
        <option>عرض اليوم</option> 
      </select>
      <button className="bg-yellow text-white px-4 py-2 rounded-md font-semibold">
        + إضافة
      </button>
    </div>
  </div>

  <div className="flex space-x-2 overflow-x-auto pb-2">
    {days.map((day, index) => {
      const isCurrentDay = isToday(day);
      const isSelected = isSameDay(day, selectedDate);
      const lowOpacity = index < 4 || index > 15;
      const isHighlighted = schedules.some(schedule => 
        schedule.scheduled_date && 
        isSameDay(day, new Date(schedule.scheduled_date))
      );
      
      return (
        <button
          key={day.toString()}
          onClick={() => onDateSelect(day)}
          className={`flex flex-col items-center justify-center w-12 h-12 p-4 rounded-full ${
            isSelected ? 'bg-gray-dark text-white' :
            isCurrentDay ? 'bg-gray-300 text-black' :
            isHighlighted ? 'bg-yellow text-white' : 'text-gray-400 hover:bg-gray-100'
          } ${lowOpacity ? 'opacity-50' : ''}`}
        >
          <span className="text-xs">{format(day, 'EEE', { locale: ar }).toUpperCase()}</span>
          <span className={`text-sm ${isSelected || isCurrentDay || isHighlighted ? 'font-bold' : ''}`}>
            {format(day, 'd', { locale: ar })}
          </span>
        </button>
      );
    })}
  </div>
</div>

  

  );
};


interface ScheduleProps {
  selectedDate: Date;
  schedules: Schedule[];
}



export const ScheduleProfile: React.FC<ScheduleProps> = ({ selectedDate, schedules }) => {
  const [loading, setLoading] = useState<boolean>(false); // Loading state
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]); // State for filtered schedules

  useEffect(()=>{
    fetchGroups()
    
  },[])
  const fetchGroups = async () => {
    setLoading(true); 
    try {
        const response = await axiosClientInstance.get<Group[]>(`/groups/`);
        setGroups(response.data);
    } catch (error) {
        console.error('Error fetching schedules:', error);
    } finally {
        setLoading(false); 
    }}
    
    useEffect(() => {
      const selectedDateObj = new Date(selectedDate); // Convert selectedDate to Date object
      const newFilteredSchedules = schedules.filter(schedule => {
        if (schedule.scheduled_date) {
          const scheduleDate = parseISO(schedule.scheduled_date); // Use parseISO to safely parse
          if (isValid(scheduleDate)) { // Check if the parsed date is valid
            return isSameDay(scheduleDate, selectedDateObj); // Compare the dates using isSameDay
          }
        }
        return false; // If no valid date, skip
      });
      setFilteredSchedules(newFilteredSchedules); // Update filtered schedules state
    }, [selectedDate, schedules]); // Depend on selectedDate and schedules
  
  

    
  
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">توقيت ليوم {format(selectedDate, 'MMMM d, yyyy')}</h3>
      <div className="space-y-4">

          {filteredSchedules.map((schedule) => (
            <div key={schedule.id} className={`bg-${schedule.color} p-4 rounded-lg bg-opacity-30`}>
              <div className="flex justify-between items-center">
                <div className='flex'>
                  <div className={`w-10 h-10 ml-4 mx-auto bg-${schedule.color} overflow-hidden text-white flex items-center justify-center`}>
                    <svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 3H21M12 18L7 21M12 18L17 21M12 18V21M12 18V15M12 15H15.8C16.9201 15 17.4802 15 17.908 14.782C18.2843 14.5903 18.5903 14.2843 18.782 13.908C19 13.4802 19 12.9201 19 11.8V7M12 15H8.2C7.0799 15 6.51984 15 6.09202 14.782C5.71569 14.5903 5.40973 14.2843 5.21799 13.908C5 13.4802 5 12.9201 5 11.8V7" 
                      stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex flex-col">
                  {(() => {
                      const group = groups.find(g => g.id === schedule.group);
                      return (
                        <div>
                          <h3 className="font-semibold"> {group?.grade.name} {group?.grade.school_level} </h3>
                          <h3 className="font-semibold">({group?.name || "Unknown Group"})</h3>
                        </div>
                      );
                    })()}
                    {/* <h3 className="font-semibold">{groups[schedule.group]?.name}</h3> */}
                    <p className="text-sm text-gray-700">{schedule.start_time} - {schedule.end_time} </p>
                    
                  </div>
                </div>
                <div className="flex items-center">
                <div className="flex -space-x-2 mr-2">
                    {groups.find(g => g.id === schedule.group)?.students?.slice(0, 3).map((student, i) => (
                      <img 
                        key={i} 
                        src={`${student.user.avatar_file}`} // Assuming each student object has an `avatarUrl` field
                        alt={`${student.user.first_name}'s avatar`} // Optional: Add student name to the alt attribute
                        className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-700">+{ groups.find(g => g.id === schedule.group)?.students?.length || 0}</span>
                  <button className="ml-2 text-gray-400">...</button>
                </div>
              </div>
            </div>
          ))}

      </div>
    </div>
  );
};


