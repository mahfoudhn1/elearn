"use client";
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
  const days = Array.from({ length: 18 }, (_, i) => addDays(currentDate, i - 9));
  const midpoint = Math.ceil(days.length / 2); // Split into two rows
  const firstRow = days.slice(0, midpoint);
  const secondRow = days.slice(midpoint);

  return (
    <div className="mb-8 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">الجدول</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <select className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>عرض اليوم</option>
          </select>
          <button className="w-full sm:w-auto bg-yellow-400 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors">
            + إضافة
          </button>
        </div>
      </div>

      {/* Calendar - Mobile: Two Rows, Desktop: Single Row */}
      <div className="relative">
        {/* Mobile Layout: Two Rows */}
        <div className="block sm:hidden space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            {firstRow.map((day, index) => {
              const isCurrentDay = isToday(day);
              const isSelected = isSameDay(day, selectedDate);
              const lowOpacity = index < 4 || index > 15; // Adjust based on full array context
              const isHighlighted = schedules.some(schedule =>
                schedule.scheduled_date &&
                isSameDay(day, new Date(schedule.scheduled_date))
              );

              return (
                <button
                  key={day.toString()}
                  onClick={() => onDateSelect(day)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-gray-800 text-white shadow-lg'
                      : isCurrentDay
                      ? 'bg-blue-100 text-blue-800'
                      : isHighlighted
                      ? 'bg-yellow-200 text-gray-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  } ${lowOpacity ? 'opacity-60' : ''}`}
                >
                  <span className="text-xs font-medium">
                    {format(day, 'EEE', { locale: ar }).toUpperCase()}
                  </span>
                  <span className={`text-sm ${isSelected || isCurrentDay || isHighlighted ? 'font-bold' : 'font-medium'}`}>
                    {format(day, 'd', { locale: ar })}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {secondRow.map((day, index) => {
              const isCurrentDay = isToday(day);
              const isSelected = isSameDay(day, selectedDate);
              const lowOpacity = index + midpoint < 4 || index + midpoint > 15; // Adjust based on full array context
              const isHighlighted = schedules.some(schedule =>
                schedule.scheduled_date &&
                isSameDay(day, new Date(schedule.scheduled_date))
              );

              return (
                <button
                  key={day.toString()}
                  onClick={() => onDateSelect(day)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-gray-800 text-white shadow-lg'
                      : isCurrentDay
                      ? 'bg-blue-100 text-blue-800'
                      : isHighlighted
                      ? 'bg-yellow-200 text-gray-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  } ${lowOpacity ? 'opacity-60' : ''}`}
                >
                  <span className="text-xs font-medium">
                    {format(day, 'EEE', { locale: ar }).toUpperCase()}
                  </span>
                  <span className={`text-sm ${isSelected || isCurrentDay || isHighlighted ? 'font-bold' : 'font-medium'}`}>
                    {format(day, 'd', { locale: ar })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Layout: Single Row */}
        <div className="hidden sm:flex space-x-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-gray-800 text-white shadow-lg'
                    : isCurrentDay
                    ? 'bg-blue-100 text-blue-800'
                    : isHighlighted
                    ? 'bg-yellow-200 text-gray-800'
                    : 'text-gray-600 hover:bg-gray-100'
                } ${lowOpacity ? 'opacity-60' : ''}`}
              >
                <span className="text-xs font-medium">
                  {format(day, 'EEE', { locale: ar }).toUpperCase()}
                </span>
                <span className={`text-base ${isSelected || isCurrentDay || isHighlighted ? 'font-bold' : 'font-medium'}`}>
                  {format(day, 'd', { locale: ar })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ScheduleProfile remains unchanged as per your feedback
interface ScheduleProps {
  selectedDate: Date;
  schedules: Schedule[];
}

export const ScheduleProfile: React.FC<ScheduleProps> = ({ selectedDate, schedules }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await axiosClientInstance.get<Group[]>(`/groups/`);
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const selectedDateObj = new Date(selectedDate);
    const newFilteredSchedules = schedules.filter(schedule => {
      if (schedule.scheduled_date) {
        const scheduleDate = parseISO(schedule.scheduled_date);
        if (isValid(scheduleDate)) {
          return isSameDay(scheduleDate, selectedDateObj);
        }
      }
      return false;
    });
    setFilteredSchedules(newFilteredSchedules);
  }, [selectedDate, schedules]);

  return (
      <div className="mb-8 px-4 sm:px-0 ">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
        توقيت ليوم {format(selectedDate, 'MMMM d, yyyy', { locale: ar })}
      </h3>
      {loading ? (
        <div className="text-center text-gray-500">جاري التحميل...</div>
      ) : filteredSchedules.length === 0 ? (
        <div className="text-center text-gray-500 py-8">لا توجد مواعيد لهذا اليوم</div>
      ) : (
        <div className="space-y-4">
          {filteredSchedules.map((schedule) => {
            const group = groups.find(g => g.id === schedule.group);
            return (
              <div 
                key={schedule.id} 
                className={`p-4 rounded-xl bg-opacity-10 bg-${schedule.color} border border-${schedule.color} shadow-sm hover:shadow-md transition-all duration-200`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className={`w-12 h-12 bg-${schedule.color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path 
                          d="M3 3H21M12 18L7 21M12 18L17 21M12 18V21M12 18V15M12 15H15.8C16.9201 15 17.4802 15 17.908 14.782C18.2843 14.5903 18.5903 14.2843 18.782 13.908C19 13.4802 19 12.9201 19 11.8V7M12 15H8.2C7.0799 15 6.51984 15 6.09202 14.782C5.71569 14.5903 5.40973 14.2843 5.21799 13.908C5 13.4802 5 12.9201 5 11.8V7" 
                          stroke="#FFF" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {group?.grade.name} {group?.grade.school_level}
                      </h3>
                      <p className="text-sm text-gray-600">({group?.name || "مجموعة غير معروفة"})</p>
                      <p className="text-sm text-gray-700 mt-1">{schedule.start_time} - {schedule.end_time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
                    <div className="flex -space-x-2">
                      {group?.students?.slice(0, 3).map((student, i) => (
                        <img 
                          key={i}
                          src={`${student.user.avatar_file}`}
                          alt={`${student.user.first_name}'s avatar`}
                          className="w-8 h-8 rounded-full border-2 border-white object-cover"
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">+{group?.students?.length || 0}</span>
                    <button className="text-gray-500 hover:text-gray-700 p-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};