"use client"
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axiosClientInstance from '../../../../../lib/axiosInstance';
import { Schedule } from '../../../../../types/student';
import CustomDatePicker from './Datepicker';
import ScheduleList from './List';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../store/store';

interface ScheduleFormData {
    day_of_week?: string;
    group_id: number;
    schedule_type: string;
    start_time: string;
    end_time: string;
    scheduled_date?: string;
    color?:string;
}

const SchedulePage = () => {
    const today = new Date();
    const params = useParams<{ id: string }>();
    const groupId = Number(params.id);
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const newDayOfWeek = daysOfWeek[today.getDay()];
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [dayOfWeek, setDayOfWeek] = useState<string>(newDayOfWeek);
    const [scheduleType, setScheduleType] = useState<string>('weekly');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [scheduledDate, setScheduledDate] = useState<Date | null>(today);
    const [loading, setLoading] = useState<boolean>(false); // Loading state
    const [selectedColor, setSelectedColor] = useState('');

    const user = useSelector((state:RootState)=> state.auth.user)
    
    useEffect(() => {
        if (groupId) {
            fetchSchedules();
        }
        
    }, [groupId]);
    
    useEffect(() => {
      console.log('Selected Color:', selectedColor); // Log the updated state
    }, [selectedColor]); // Run this effect when selectedColor changes
  
    const fetchSchedules = async () => {
        if (!groupId) return;

        setLoading(true); // Set loading to true
        try {
            const response = await axiosClientInstance.get<Schedule[]>(`/groups/schedules/`, {
                params: {
                    group_id: groupId
                }
            });
            
            setSchedules(response.data);
        } catch (error) {
            console.error('Error fetching schedules:', error);
        } finally {
            setLoading(false); // Set loading to false
        }
    };

    const handleDateSelect = (date: Date | null) => {
      setScheduledDate(date);
    
      if (date) {
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const newDayOfWeek = daysOfWeek[date.getDay()];
        setDayOfWeek(newDayOfWeek);
      } else {
        setDayOfWeek(""); 
      }
      
    };
  
    const handleFrequencySelect = (frequency: string) => {

      setScheduleType(frequency)
    };
  
    

    const isValidTime = (dayOfWeek: string, startTime: string, endTime: string): boolean => {
      const start = startTime.split(':').map(Number);
      const end = endTime.split(':').map(Number);
  
      if (dayOfWeek === 'friday' || dayOfWeek === 'saturday') {
        return start[0] >= 8 && end[0] <= 22; // 08:00 to 20:00
      } else {
        return start[0] >= 12 && end[0] <= 22; // 18:00 to 20:00
      }
    };
    
    const postSchedule = async () => {
      setLoading(true);
  
      const requestData: ScheduleFormData = {
        day_of_week: dayOfWeek,
        group_id: groupId,
        schedule_type: scheduleType,
        start_time: startTime,
        end_time: endTime,
        scheduled_date: scheduledDate ? scheduledDate.toLocaleDateString('en-CA').split('T')[0] : undefined,
        color:selectedColor
      };
  
      
        const weekday = scheduledDate?.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        requestData.day_of_week = weekday;

  
      if (!isValidTime(requestData.day_of_week!, startTime, endTime)) {
        alert(`Open time for ${requestData.day_of_week} is invalid.`);
        setLoading(false);
        return;
      }
  
      try {
        const response = await axiosClientInstance.post<Schedule>(`/groups/schedules/`, requestData);
        setSchedules([...schedules, response.data]);
      } catch (error) {
        console.error('Error posting schedule:', error);
      } finally {
        setLoading(false);
      }
    };
    const handleStartTimeChange = (time: string) => {
      setStartTime(time);
    };
    
    const handleEndTimeChange = (time: string) => {
      setEndTime(time);
    };
    const deleteSchedule = async (scheduleId: number) => {
        try {
            await axiosClientInstance.delete(`/groups/schedules/${scheduleId}/`);
            setSchedules((prevSchedules) => prevSchedules.filter(schedule => schedule.id !== scheduleId));
        } catch (error) {
            console.error('Error deleting schedule:', error);
        }
    };
    const handleColorSelect = (color:string) => {
      setSelectedColor(color)
      
    };

      return (
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">جدولت تواقيت المجموعة  {groupId}</h1>
          <div className='flex md:flex-row flex-col'>
          <div className='md-w-1/2 w-full md:ml-2 ' >
            <ScheduleList schedules={schedules} onCancel={deleteSchedule} role={user?.role}/>
          </div>
            <div className="md-w-1/2 w-full">
            {user?.role == "teacher" && 
              <CustomDatePicker onDateSelect={handleDateSelect}
                                onFrequencySelect={handleFrequencySelect}
                                onSchedule={postSchedule}
                                dayOfWeek={dayOfWeek}
                                onStartTimeChange={handleStartTimeChange}  
                                onEndTimeChange={handleEndTimeChange}      
                                onColorSelect={handleColorSelect}
                                />
            }
            </div>

          </div>

        </div>
      );
    
};

export default SchedulePage;