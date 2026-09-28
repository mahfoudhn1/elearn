"use client"
import React from 'react';
import { CalendarCheck2, Clock, MapPin, Trash2 } from 'lucide-react';
import { Schedule } from '../../../../../types/student';
import { useParams, useRouter } from 'next/navigation';

interface ScheduleListProps {
  schedules: Schedule[];
  role?: string;
  onCancel?: (scheduleId: string) => void;
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

  const params = useParams();
  const router = useRouter();

  const GoToMeeting = (id: string) => {
    router.push(`/lives?roomId=${id}`);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">التوقيت</h2>
      
      {schedules?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          لا توجد مواعيد مجدولة
        </div>
      ) : (
        <div className="space-y-3">
          {schedules?.map((schedule, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-xl transition-all hover:shadow-md 
                bg-${schedule.color} 
                text-white border border-${schedule.color}`}
            >
              <div className="flex justify-between items-start">
                <div 
                  className="flex-1 flex items-start cursor-pointer gap-4"
                  onClick={() => GoToMeeting(schedule.Meeting.id)}
                >
                  <div className="bg-white/20 p-2 rounded-lg">
                    <CalendarCheck2 size={18} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">
                      {schedule.day_of_week in ArabdaysOfWeek
                        ? ArabdaysOfWeek[schedule.day_of_week as DayOfWeek]
                        : 'Invalid Day'}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center">
                        <Clock size={14} className="ml-1" />
                        {schedule.start_time} - {schedule.end_time}
                      </div>
                      <div className="flex items-center">
                        <CalendarCheck2 size={14} className="ml-1" />
                        {schedule.scheduled_date}
                      </div>
                    </div>
                  </div>
                </div>

                {role === "teacher" && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel && onCancel(schedule.id);
                    }}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleList;