'use client';

import { format, startOfToday, addMonths, subMonths } from 'date-fns';
import React, { useState, useEffect, useRef } from 'react';
import { GrFormNext, GrFormPrevious } from 'react-icons/gr';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from 'date-fns';
import Datepicker from "react-tailwindcss-datepicker";
import axiosInstance from '../../../store/axiosInstance';
import Sidebar from '../../components/dahsboardcomponents/sidebar';
import Navbar from '../../components/dahsboardcomponents/navbar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDeleteLeft, faEdit, faRemove, faX } from '@fortawesome/free-solid-svg-icons';



interface Meeting {
  topic: string;
  agenda: string;
  duration: number;
  start_time: string; 
}

function CallendarPage() {
  type DateValueType = {
    startDate: Date | null;
    endDate: Date | null;
  } | null;

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const currentDate = startOfToday();
  const [datepickerValue, setDatepickerValue] = useState<Date | null>(new Date());
  const [today, setToday] = useState(currentDate);
  const [selectDate, setSelectDate] = useState(currentDate);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [newMeeting, setNewMeeting] = useState<Meeting>({
    topic: '',
    agenda: '',
    duration: 60,
    start_time: "", // Default to the current date/time
  });  const [isPopupOpen, setIsPopupOpen] = useState(false); // State for popup visibility
  const [timeValue, setTimeValue] = useState<string>('');
  const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      const response = await axiosInstance.get(`/livestream/zoom-meetings/?date=${format(selectDate, 'yyyy-MM-dd')}`);
      setMeetings(response.data);
    };
    fetchMeetings();
  }, [selectDate]);
  
  

  const handleDateChange = (value: DateValueType) => {
    if (value && value.startDate) {
      setDatepickerValue(value.startDate);
    } else {
      setDatepickerValue(null);
    }
  };
  const handleTimeChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setTimeValue(event.target.value);
  };


  const handleScheduleMeeting = async () => {
    if (!datepickerValue) {
      alert('Please select a date.');
      return;
    }

    const combinedDateTime = format(
      new Date(
        `${format(datepickerValue, 'yyyy-MM-dd')}T${timeValue}:00`
      ),
      "yyyy-MM-dd'T'HH:mm:ss"
    );

    try {
      const response = await axiosInstance.post('/livestream/zoom-meetings/', {
        ...newMeeting,
        start_time: combinedDateTime
      });
      setMeetings([...meetings, response.data]);
      setNewMeeting({ topic: '', agenda: '', duration: 60, start_time:'' });
    } catch (error) {
      console.error("Failed to schedule meeting", error);
    }
    setIsPopupOpen(false)
  };

  const generateDate = (month: Date) => {
    const startMonth = startOfMonth(month);
    const endMonth = endOfMonth(month);
    const start = startOfWeek(startMonth);
    const end = endOfWeek(endMonth);

    const dateArray = [];
    let date = start;

    while (date <= end) {
      const dayMeetings = meetings.filter(meeting => isSameDay(new Date(meeting.start_time), date));
      dateArray.push({
        date: date,
        currentMonth: isSameMonth(date, month),
        today: isToday(date),
        meetings: dayMeetings.length > 0
      });
      date = addDays(date, 1);
    }

    return dateArray;
  }

  const handleEdit = (meeting: any) => {
    setNewMeeting({
      topic: meeting.topic,
      agenda: meeting.agenda,
      duration: meeting.duration,
      start_time: meeting.started_time, 

    });
    setEditingMeetingId(meeting.id);
    setIsPopupOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axiosInstance.put(`/livestream/zoom-meetings/${editingMeetingId}/`, {
        ...newMeeting,
        start_time: format(newMeeting.start_time, "yyyy-MM-dd'T'HH:mm:ss"),
      });
      setMeetings(meetings.map(meeting => 
        meeting.id === editingMeetingId ? response.data : meeting
      ));
      setIsPopupOpen(false);
      setNewMeeting({ topic: '', agenda: '', duration: 60, start_time:"" });
    } catch (error) {
      console.error("Failed to update meeting", error);
    }
  };

  const handleDelete = async (meetingId: number) => {
    try {
      await axiosInstance.delete(`/livestream/zoom-meetings/${meetingId}/`);
      setMeetings(meetings.filter(meeting => meeting.id !== meetingId));
    } catch (error) {
      console.error("Failed to delete meeting", error);
    }
  };


  const formattedMonthYear = format(today, 'MMMM yyyy');

  return (

    <div className='flex flex-row'>
      <Sidebar/>
    <div className="flex flex-col w-full">
    <Navbar/>
    <div className="flex sm:flex-row md:p-24 p-4 justify-between md:mx-28 mx-2  flex-col">
      <div className="w-96 h-96 ml-8">
        <div className="flex justify-between items-center">
          <h1 className="select-none font-semibold">{formattedMonthYear}</h1>
          <div className="flex gap-10 items-center">
            <GrFormPrevious
              className="w-5 h-5 cursor-pointer hover:scale-105 transition-all"
              onClick={() => setToday(subMonths(today, 1))}
            />
            <h1
              className="cursor-pointer hover:scale-105 transition-all"
              onClick={() => setToday(currentDate)}
            >
              Today
            </h1>
            <GrFormNext
              className="w-5 h-5 cursor-pointer hover:scale-105 transition-all"
              onClick={() => setToday(addMonths(today, 1))}
            />
          </div>
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => (
            <h1
              key={index}
              className="text-sm text-center h-14 w-14 grid place-content-center text-gray-500 select-none"
            >
              {day}
            </h1>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {generateDate(today).map(({ date, currentMonth, today, meetings }, index) => (
            <div
              key={index}
              className="p-2 text-center text-gray-700 h-14 grid place-content-center text-sm border-t border-gray relative"
            >
              <h1
                className={`
                  ${currentMonth ? '' : 'text-gray-light'}
                  ${today ? 'bg-purple text-white' : ''}
                  ${selectDate.toDateString() === date.toDateString() ? 'bg-gray-dark text-white' : ''}
                  h-10 w-10 rounded-full grid place-content-center hover:bg-black hover:text-white transition-all cursor-pointer select-none
                `}
                onClick={() => setSelectDate(date)}
              >
                {format(date, 'd')}
              </h1>
              {meetings && (
                <div className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col space-y-4">
        <h1 className=" text-gray-dark font-semibold">
          قائمة الدروس ليوم: {format(selectDate, 'MMMM dd, yyyy')}
        </h1>
        {meetings.length === 0 ? (
          <p className="text-gray">لا حصص لليوم</p>
        ) : (
          <ul className="space-y-2">
            {meetings.map((meeting, index) => (
              <li key={index} className="text-gray-800 flex flex-row space-x-4 border-b pb-4 border-gray-700 border-dashed pt-5">
                <div>
                <strong>{meeting.topic}</strong> - {format(new Date(meeting.start_time), 'hh:mm a')}
                </div>
                <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(meeting)}
                  className=" text-gray-dark px-2 py-1 rounded-lg transition-colors hover:bg-gray-dark hover:text-white"
                >
                <FontAwesomeIcon icon={faEdit}/>
                  
                </button>
                <button
                  onClick={() => handleDelete(meeting.id)}
                  className=" text-gray-dark px-2 py-1 rounded-lg transition-colors hover:bg-gray-dark hover:text-white"
                >
                  <FontAwesomeIcon icon={faRemove} />
                </button>
              </div>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => setIsPopupOpen(true)}
          className="bg-gradient-to-tl from-purple to-gray-dark text-white p-2 rounded-lg mt-4"
        >
          جدول حصة جديدة
        </button>

        {isPopupOpen && (
          <div

          className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white flex flex-col rounded-lg p-8 w-11/12 md:w-1/2 lg:w-1/3 relative">
              <button onClick={() => setIsPopupOpen(false)} className="absolute top-4 right-4 text-gray-500">X</button>
              <h2 className="font-semibold mt-4">جدولة الدرس القادم</h2>
              <input
                type="text"
                placeholder="Topic"
                value={newMeeting.topic}
                onChange={(e) => setNewMeeting({ ...newMeeting, topic: e.target.value })}
                className="border-1 bg-gray-light focus:outline-none border-none rounded-lg p-2 mt-2"
              />
              <textarea
                placeholder="ملاحظة"
                value={newMeeting.agenda}
                onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
                className="border-1 bg-gray-light focus:outline-none border-none rounded-lg p-2 mt-2"
              />
              <div className='datepicker'>
              <Datepicker
                useRange={false}
                asSingle={true}
                value={{ startDate: datepickerValue, endDate: datepickerValue }}
                onChange={handleDateChange}
                displayFormat={"DD/MM/YYYY"}
                inputClassName="border-1 bg-gray-light focus:outline-none border-none rounded-lg p-2 mt-2"
              />
              </div>
              <input
                  type="time"
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="border-1 bg-gray-light focus:outline-none border-none rounded-lg p-2 mt-2"
                />
              <input
                type="number"
                placeholder="مدة الحصة )بالدقيقة("
                value={newMeeting.duration}
                onChange={(e) => setNewMeeting({ ...newMeeting, duration: Number(e.target.value) })}
                className="border-1 bg-gray-light focus:outline-none border-none rounded-lg p-2 mt-2"
              />
              <button
                onClick={handleScheduleMeeting}
                className="bg-gradient-to-tl from-purple to-gray-dark text-white p-2 rounded-lg mt-4"
              >
                حفظ
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
    </div>
    </div>
  );
}

export default CallendarPage;
