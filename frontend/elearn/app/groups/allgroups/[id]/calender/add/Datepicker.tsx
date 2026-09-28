import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import axiosClientInstance from '../../../../../lib/axiosInstance';
import { useParams } from 'next/navigation';
import ColorPicker from './ColorPicker';

type Frequency = 'custom' | 'Weekly';

interface CustomDatePickerProps {
  onDateSelect?: (date: Date | null) => void;
  onFrequencySelect?: (frequency: Frequency) => void;
  onSchedule: () => void;
  onColorSelect: (color: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  dayOfWeek: string;
}

const DAYS_OF_WEEK = ['الاثنين', 'الثلاثاء', 'الاربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  onDateSelect,
  onFrequencySelect,
  onSchedule,
  onColorSelect,
  dayOfWeek,
  onStartTimeChange,
  onEndTimeChange,
}) => {
  const params = useParams<{ groupId: string }>();
  const groupId = String(params.groupId);

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [frequency, setFrequency] = useState<Frequency>('Weekly');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleColorClick = (color: string) => {
    onColorSelect(color);
  };

  const frequencies: Frequency[] = ['custom', 'Weekly'];

  const generateTimeRange = (startHour: number, endHour: number) => {
    return Array.from({ length: endHour - startHour + 1 }, (_, i) => 
      `${String(startHour + i).padStart(2, '0')}:00`
    );
  };

  const getAvailableTimes = (day: string, isEndTime = false) => {
    const isWeekend = day === 'friday' || day === 'saturday';
    if (isEndTime) {
      return isWeekend ? generateTimeRange(8, 22) : generateTimeRange(12, 22);
    }
    return isWeekend ? generateTimeRange(8, 20) : generateTimeRange(12, 20);
  };

  const availableStartTimes = dayOfWeek ? getAvailableTimes(dayOfWeek) : [];
  const availableEndTimes = dayOfWeek ? getAvailableTimes(dayOfWeek, true) : [];

  const filteredEndTimes = availableEndTimes.filter(time => !startTime || time > startTime);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => new Date(
      prev.getFullYear(), 
      prev.getMonth() + (direction === 'prev' ? -1 : 1), 
      1
    ));
  };

  const handleDateClick = (day: number): void => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    onDateSelect?.(newDate);
  };

  const handleFrequencyChange = (newFrequency: Frequency): void => {
    setFrequency(newFrequency);
    onFrequencySelect?.(newFrequency);
  };

  const handleTimeChange = (
    e: React.ChangeEvent<HTMLSelectElement>, 
    isStartTime: boolean
  ) => {
    const selectedTime = e.target.value;
    if (isStartTime) {
      setStartTime(selectedTime);
      onStartTimeChange(selectedTime);
    } else {
      setEndTime(selectedTime);
      onEndTimeChange(selectedTime);
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    const firstDayIndex = new Date(
      currentMonth.getFullYear(), 
      currentMonth.getMonth(), 
      1
    ).getDay();
    const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const daysInMonth = new Date(
      currentMonth.getFullYear(), 
      currentMonth.getMonth() + 1, 
      0
    ).getDate();

    for (let i = 0; i < 42; i++) {
      if (i < adjustedFirstDayIndex || i >= adjustedFirstDayIndex + daysInMonth) {
        days.push(<div key={`empty-${i}`} className="h-8"></div>);
      } else {
        const day = i - adjustedFirstDayIndex + 1;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const isSelected = selectedDate?.toDateString() === date.toDateString();

        days.push(
          <button
            key={day}
            onClick={() => handleDateClick(day)}
            className={`h-8 w-8 flex items-center justify-center rounded-full text-sm ${
              isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
            }`}
          >
            {day}
          </button>
        );
      }
    }

    return days;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full">
      <h2 className="text-lg font-semibold mb-4">حدد توقيت المجموعة</h2>
      <p className="text-sm text-gray-700 mb-4">يمكنك برمجة توقيت اسبوعي او يومي حسب الحاجة.</p>
      
      <div className="flex md:flex-row flex-col w-full justify-center">
        {/* Calendar Section */}
        <div className="flex flex-col ml-4">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => handleMonthChange('prev')} className="p-1">
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
            <button onClick={() => handleMonthChange('next')} className="p-1">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="mb-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-700">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendarDays()}
            </div>
          </div>
        </div>

        {/* Time Selection Section */}
        <div className="md:mr-8 flex flex-col justify-center items-center">
          <h3 className="text-lg text-grey-900 font-medium my-4">حدد وقت الحصة</h3>
          <div className="flex flex-col space-y-4">
            <select
              className="border-b p-2 mr-2 bg-white border-grey-900 text-grey-900 focus:outline-none delay-25"
              value={startTime}
              onChange={(e) => handleTimeChange(e, true)}
              required
            >
              <option value="">بدأ الدرس</option>
              {availableStartTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>

            <select
              className="border-b p-2 mr-2 bg-white border-grey-900 text-grey-900 focus:outline-none delay-25"
              value={endTime}
              onChange={(e) => handleTimeChange(e, false)}
              required
            >
              <option value="">نهاية الدرس</option>
              {filteredEndTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {/* Frequency Selection */}
          <div>
            <h3 className="text-lg text-grey-900 font-medium my-4">حدد نوعية التوقيت</h3>
            <div className="space-y-2">
              {frequencies.map((freq) => (
                <label key={freq} className="flex items-center">
                  <input
                    type="radio"
                    value={freq}
                    checked={frequency === freq}
                    onChange={() => handleFrequencyChange(freq)}
                    className="ml-2"
                  />
                  <span className="text-base text-gray">
                    {freq === 'custom' ? 'مرة واحدة' : 'اسبوعي'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ColorPicker onColorSelect={handleColorClick} />
      
      <div className="flex justify-center mt-4">
        <button 
          className="bg-blue-500 text-white p-2" 
          onClick={onSchedule}
        >
          اضافة توقيت
        </button>
      </div>
    </div>
  );
};

export default CustomDatePicker;