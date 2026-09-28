import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useRouter } from 'next/navigation';
import RecordingComponent from './RecordingComponent';
import JitsiIFrameComponent from './JitsiIFrameComponent';

const JitsiMeetComponent: React.FC<{ meetingData: any }> = ({ meetingData }) => {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const displayName = user?.username || 'Participant';
  const email = user?.email || '';
  const role = user?.role;

  return (
    <div className="relative flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-purple-600 text-white p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">بث مباشر</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{displayName}</span>
            </div>
            <RecordingComponent />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex-1 overflow-hidden">
        <JitsiIFrameComponent
          meetingData={meetingData}
          role={role}
          displayName={displayName}
        />
      </div>
    </div>
  );
};

export default JitsiMeetComponent;