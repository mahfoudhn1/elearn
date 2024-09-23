import React from 'react';
import { CalendarCheck2, Clock, MapPin, Trash2 } from 'lucide-react';
import { Schedule } from '../../../../../types/student';

interface ScheduleListProps {
  schedules: Schedule[];
  role?:string;
  onCancel?: (scheduleId: number) => void 
}
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';


const ScheduleList: React.FC<ScheduleListProps> = ({ schedules, onCancel, role }) => {
  
  const ArabdaysOfWeek: Record<DayOfWeek, string> = {
    "monday": 'الاثنين',
    "tuesday": 'الثلاثاء',
    "wednesday": 'الأربعاء',
    "thursday": 'الخميس',
    "friday": 'الجمعة',
    "saturday": 'السبت',
    "sunday": 'الأحد'
  };
  console.log(schedules);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mt-4">
      <h2 className="text-2xl font-semibold text-gray-dark mb-4">التوقيت</h2>
      {schedules?.map((schedule, index) => (
        <div key={index} className={`mb-4 last:mb-0 p-2 shadow rounded-lg bg-${schedule.color} bg-opacity-70`}>
          <div className="flex justify-between items-start mb-1">
            <div className="flex">
            <div className='flex flex-col border-l justify-center'>
              <p className="text-white text-sm flex ml-4 items-center">
                <Clock size={14} className="mr-1" />
                {schedule.start_time}
              </p>
              <p className="text-white text-sm flex items-center">
                <Clock size={14} className="mr-1" />
                {schedule.end_time}
              </p>
            </div>
              <div className="flex flex-col justify-center mr-2 ">
              <h3 className="font-medium text-white text-lg mr-4">
                {schedule.day_of_week in ArabdaysOfWeek
                  ? ArabdaysOfWeek[schedule.day_of_week as DayOfWeek]
                  : 'Invalid Day'}
                </h3>
              <p className="text-white text-sm flex items-center">
                <CalendarCheck2 size={14} className="mx-1" />
                {schedule.scheduled_date}
              </p>
              </div>
            </div>
            <div>
              {role == "teacher" &&
            <div className="flex justify-end mt-2">
              <div className='bg-gray p-2 rounded-lg cursor-pointer hover:bg-gray-dark '
                onClick={() => onCancel && onCancel(schedule.id)} // Safe invocation of onCancel
                    >
              <button className=" text-white mx-2"
              
              >
                Cancel
              </button>
              <button className="text-white hover:text-gray">
                <Trash2 size={16} />
              </button>
              </div>
            </div>

          }
            </div>
          </div>
          
        </div>
      ))}
    </div>
  );
};

export default ScheduleList;