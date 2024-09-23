import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import axiosClientInstance from '../../../../../lib/axiosInstance';
import { Schedule } from '../../../../../types/student';
import { useParams } from 'next/navigation';

type Frequency = 'custom' | 'Weekly' 

interface CustomDatePickerProps {
  onDateSelect?: (date: Date | null) => void;
  onFrequencySelect?: (frequency: Frequency) => void;
  onSchedule: () => void;
  onColorSelect: (color: string) => void;
  onStartTimeChange: (time: string) => void;  // Callback to send startTime to parent
  onEndTimeChange: (time: string) => void; 
  dayOfWeek: string;
}

interface ScheduleFormData {
  day_of_week?: string;
  group_id: number;
  schedule_type: string;
  start_time: string;
  end_time: string;
  scheduled_date?: string;
}


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
  const groupId = Number(params.groupId);
  
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [frequency, setFrequency] = useState<Frequency>('Weekly');
  
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const daysInMonth: number = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth: number = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const frequencies: Frequency[] = ['custom', 'Weekly'];

 

  const handleFrequencyChange = (newFrequency: Frequency): void => {
    setFrequency(newFrequency)
    onFrequencySelect?.(newFrequency);
  };

const handleStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTime = e.target.value;
    setStartTime(selectedTime);
    onStartTimeChange(selectedTime);  // Send startTime to parent
  };

  // Handle end time change
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTime = e.target.value;
    setEndTime(selectedTime);
    onEndTimeChange(selectedTime);  // Send endTime to parent
  };

  
  const generateAvailableTimes = (day: string) => {
    const times = [];
    if (day === 'friday' || day === 'saturday') {
      for (let hour = 8; hour <= 20; hour++) {
        times.push(`${String(hour).padStart(2, '0')}:00`);
      }
    } else {
      for (let hour = 18; hour <= 20; hour++) {
        times.push(`${String(hour).padStart(2, '0')}:00`);
      }
    }
    return times;
  };
  const generateAvailableEnTimes = (day: string) => {
    const times = [];
    if (day === 'friday' || day === 'saturday') {
      for (let hour = 8; hour <= 22; hour++) {
        times.push(`${String(hour).padStart(2, '0')}:00`);
      }
    } else {
      for (let hour = 18; hour <= 22; hour++) {
        times.push(`${String(hour).padStart(2, '0')}:00`);
      }
    }
    return times;
  };
  const availableStartTimes = dayOfWeek ? generateAvailableTimes(dayOfWeek) : [];
  const availableEndTimes = dayOfWeek ? generateAvailableEnTimes(dayOfWeek) : [];

  const filteredEndTimes = availableEndTimes.filter((time) => {
    if (!startTime) return true; // Show all if no start time is selected
    return time > startTime; // Only show end times that are greater than the selected start time
  });


  const handlePrevMonth = (): void => {
    setCurrentMonth(prevMonth => new Date(prevMonth.getFullYear(), prevMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (): void => {
    setCurrentMonth(prevMonth => new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number): void => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    
    onDateSelect?.(newDate);
  };
  const handleAddSchedule = () => {
    return onSchedule();  
  };

  const renderCalendar = () => {
    const days = [];
    const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Adjust for Monday start
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    for (let i = 0; i < 42; i++) {
      if (i < adjustedFirstDayIndex || i >= adjustedFirstDayIndex + daysInMonth) {
        days.push(<div key={`empty-${i}`} className="h-8"></div>);
      } else {
        const day = i - adjustedFirstDayIndex + 1;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const isSelected = selectedDate && 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === currentMonth.getMonth() &&
        selectedDate.getFullYear() === currentMonth.getFullYear();
        
        days.push(
          <button
            key={day}
            onClick={() => handleDateClick(day)}
            className={`h-8 w-8 flex items-center justify-center rounded-full text-sm
              ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
          >
            {day}
          </button>
        );
      }
    }
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    );
  };


  const colorOptions = [
    { value: 'gray-700', color: 'gray-700' },
    { value: 'red-500', color: 'red-500' },
    { value: 'green', color: 'green' },
    { value: 'blue-500', color: 'blue-500' },
    { value: 'yellow', color: 'yellow' },
    { value: 'purple-800', color: 'purple-800' },
    { value: 'pink-800', color: 'pink-800' },
    { value: 'orange', color: 'orange' },

  ];
  const [selectedColor, setSelectedColor] = useState('');

  const handleColorClick = (color:string) => {
    setSelectedColor(color)
    onColorSelect(color) 
  }
  console.log(selectedColor);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full">
      <h2 className="text-lg font-semibold mb-4">حدد توقيت المجموعة</h2>
      <p className="text-sm text-gray-700 mb-4">يمكنك برمجة توقيت اسبوعي او يومي حسب الحاجة.</p>
      <div className="flex justify-center">
      <div className="flex flex-col ml-4">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="p-1">
            <ChevronLeft size={20} />
          </button>
          <span className="font-medium">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
          <button onClick={handleNextMonth} className="p-1">
            <ChevronRight size={20} />
          </button>
        </div>
      
        <div className="mb-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['الاثنين', 'الثلاثاء', 'الاربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-700">{day}</div>
            ))}
          </div>
          {renderCalendar()}
        </div>

      </div>
      
      
      <div className="md:mr-8 flex flex-col justify-center items-center">
      <h3 className="text-lg text-gray-dark font-medium my-4">حدد وقت الحصة</h3>
      <div className="flex flex-col space-y-4">
        <select
          className="border-b p-2 mr-2 bg-white border-gray-dark text-gray-dark focus:outline-none delay-25"
          value={startTime || ""}
          onChange={handleStartTimeChange}  // Handle start time selection
          required
        >
          <option value="">بدأ الدرس</option>
          {availableStartTimes.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>

        <select
          className="border-b p-2 mr-2 bg-white border-gray-dark text-gray-dark focus:outline-none delay-25"
          value={endTime || ""}
          onChange={handleEndTimeChange}  // Handle end time selection
          required
        >
          <option value="">نهاية الدرس</option>
          {filteredEndTimes.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>
        <div>

        <h3 className="text-lg text-gray-dark font-medium my-4">حدد نوعية التوقيت</h3>
        <div className="space-y-2">
          
          <label className="flex items-center">
            <input
              type="radio"
              value={frequencies[0]}
              checked={frequency === frequencies[0]}
              onChange={() => handleFrequencyChange(frequencies[0])}
              className="ml-2"
            />
            <span className="text-base text-gray">مرة واحدة</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value={frequencies[1]}
              checked={frequency === frequencies[1]}
              onChange={() => handleFrequencyChange(frequencies[1])}
              className="ml-2"
            />
            <span className="text-base text-gray">اسبوعي</span>
          </label>
        </div>
        </div>
      </div>
      </div>
      <div className="flex">
        <h3> اختر لون : </h3>
      {colorOptions.map(({ value, color }) => (
        <div
          key={value}
          className={`w-10 h-10 rounded-full bg-${color} cursor-pointer mx-1 border-transparent hover:border-black ${
            selectedColor === value ? 'border-2 border-sky-400' : ''
          }`}
          onClick={() => handleColorClick(value)}
          title={value}
        />
      ))}
    </div>
      <div className='flex justify-center mt-4'>
      <button className="bg-blue-500 text-white p-2 "
            onClick={handleAddSchedule} 
            >اضافة توقيت</button>
      </div>
    
    </div>
  );
};

export default CustomDatePicker;