"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useSearchParams, useRouter } from 'next/navigation';
import axiosClientInstance from '../lib/axiosInstance';
import dynamic from 'next/dynamic';

const JitsiMeetOptimized = dynamic(() => import('./JitsiMeetComponent'), {
  ssr: false,
});
const NoteTakingApp = dynamic(() => import('./notes'), {
  ssr: false,
});

const App: React.FC = () => {
  const router = useRouter();
  const query = useSearchParams();
  const roomId = query.get("roomId");
  // const groupId = query.get("group_id"); // No longer needed for this workflow
  const [error, setError] = useState('');
  const [meetingData, setMeetingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const user = useSelector((state: RootState) => state.auth.user);
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const fetchMeetingData = useCallback(async () => {
    if (!roomId) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      let response;
      if (isTeacher) {
        response = await axiosClientInstance.get(`/live/${roomId}/start_meeting/`);
      } else if (isStudent) {
        response = await axiosClientInstance.post(`/live/${roomId}/join_meeting/`);
      }
      
      if (response?.data) {
        setMeetingData(response.data);
      } else {
        setError('Invalid meeting data received');
      }
    } catch (err) {
      setError('Failed to load meeting data. Please try again later.');
      console.error('Error fetching meeting data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, isTeacher, isStudent]);

  useEffect(() => {
    fetchMeetingData();
  }, [fetchMeetingData]);
  console.log(meetingData);
  
  if (error) {
    router.push('/group/allgroups');
    return null;
  }

  if (isLoading || !meetingData) {
    return <div>Loading meeting data...</div>;
  }

  const isMeetingActive = meetingData?.meeting?.is_active;

  return (
    <div className="App">
      {isStudent && !isMeetingActive && (
        <div className="alert alert-danger">
          هذا البث غير شغال حاليا يرجى الانتظار حتى البدأ
        </div>
      )}

      {(isMeetingActive || isTeacher) && (
        <div>
          <JitsiMeetOptimized 
            key={`jitsi-${roomId}`} 
            meetingData={meetingData} 
          />

          <NoteTakingApp />
        </div>
      )}
    </div>
  );
};

export default App;
