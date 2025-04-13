"use client"
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import JitsiMeetComponent from './JitsiMeetComponent';
import { RootState } from '../../store/store';
import { useSearchParams } from 'next/navigation';
import axiosClientInstance from '../lib/axiosInstance';
import dynamic from 'next/dynamic'

const NoteTakingApp = dynamic(() => import('./notes'), {
  ssr: false,
});
const App: React.FC = () => {
  // Get roomId from URL or props
  const query = useSearchParams();
  const roomId = query.get("roomId");
  const [error, setError] = useState('')
  const [meetingData, setMeetingData] = useState<any>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';



  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        let response;
        if (isTeacher) {
          response = await axiosClientInstance.get(`/live/${roomId}/start_meeting/`);
        } else if (isStudent) {
          response = await axiosClientInstance.post(`/live/${roomId}/join_meeting/`);
        }
        
        setMeetingData(response?.data);
      } catch (err) {
        setError('Failed to load meeting data. Please try again later.');
        console.error('Error fetching meeting data:', err);
      }
    };

    if (roomId) {
      fetchMeetingData();
    }
  }, [roomId, isTeacher, isStudent]);

  // Handle errors
  if (error) {
    return <div>{error}</div>;
  }

  // Display loading state if meeting data is not available yet
  if (!meetingData) {
    return <div>Loading meeting data...</div>;
  }

  // Check if meeting is active for students

  const isMeetingActive = meetingData && meetingData.meeting.is_active;
  console.log(meetingData);
  console.log(meetingData.meeting);
  
  return (
    <div className="App">
      {/* Show message if student and meeting is not active */}
      {isStudent && !isMeetingActive && (
        <div className="alert alert-danger">
          The meeting is not active. Please wait until it starts.
        </div>
      )}

      {/* Render Jitsi component only if the meeting is active or the user is a teacher */}
      {isMeetingActive || isTeacher ? (
        <div>
          <JitsiMeetComponent meetingData={meetingData} />
          <NoteTakingApp />
        </div>
      ) : null}
    </div>
  );

};

export default App;
