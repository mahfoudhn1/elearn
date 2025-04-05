// JitsiMeetOptimized.tsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { RoomData } from '../types/student';
import axiosClientInstance from '../lib/axiosInstance';
import { RootState } from '../../store/store';

const JitsiMeetOptimized: React.FC<{ roomId: any }> = ({ roomId }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const displayName = user?.first_name || 'Participant';
  const email = user?.email || '';

  const [meetingData, setMeetingData] = useState<RoomData | null>(null);
  const [api, setApi] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
      try {
        const response = await axiosClientInstance.get<RoomData>(`/live/${roomId}/start_meeting/`);
        setMeetingData(response.data);
      } catch (err) {
        setError('Failed to load meeting data. Please try again later.');
        console.error('Error fetching meeting data:', err);
      }
    };
    fetchMeetingData();
  }, [roomId]);

  useEffect(() => {
    if (!meetingData || !jitsiContainerRef.current) return;

    const loadJitsiScript = () => {
      const script = document.createElement('script');
      script.src = `${meetingData.domain}/external_api.js`;
      script.async = true;
      script.onload = initializeJitsi;
      document.body.appendChild(script);
    };

    const initializeJitsi = () => {
      const domain = new URL(meetingData.domain).hostname;
      
      const options = {
        roomName: meetingData.room,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: displayName,
          email: email
        },
        configOverwrite: {
          disableSimulcast: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          enableNoisyMicDetection: false,
          prejoinPageEnabled: false,
          constraints: {
            video: {
              height: {
                ideal: 720,
                max: 720,
                min: 240
              }
            }
          },
          toolbarButtons: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'settings', 
            'raisehand', 'chat', 'tileview'
          ],
        },
        interfaceConfigOverwrite: {
          APP_NAME: 'Riffaa Education',
          SHOW_JITSI_WATERMARK: false,
          SHOW_POWERED_BY: false,
          TOOLBAR_ALWAYS_VISIBLE: true,
          MOBILE_APP_PROMO: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          HIDE_INVITE_MORE_HEADER: true,
          DEFAULT_BACKGROUND: '#374151',
        },
        jwt: meetingData.token
      };

      const jitsiApi = new (window as any).JitsiMeetExternalAPI(domain, options);
      setApi(jitsiApi);

      // Listen for chat toggle events
      jitsiApi.on('videoConferenceJoined', () => {
        jitsiApi.on('chatUpdated', (event: any) => {
          setIsChatOpen(event.isOpen);
        });
      });

      jitsiApi.on('readyToClose', () => {
        window.location.href = '/meeting-ended';
      });

      return () => {
        jitsiApi.dispose();
      };
    };

    loadJitsiScript();

    return () => {
      if (meetingData) {
        const jitsiScript = document.querySelector(`script[src="${meetingData.domain}/external_api.js"]`);
        if (jitsiScript) {
          document.body.removeChild(jitsiScript);
        }
      }
    };
  }, [meetingData, displayName, email]);

  const toggleChat = () => {
    if (api) {
      api.executeCommand('toggleChat');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Meeting Error</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!meetingData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Preparing your classroom session...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-bold text-gray-800">Riffaa Classroom</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">{displayName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex-1 overflow-hidden">
      <div className="absolute md:right-[5%] left-0 top-0 bottom-0" ref={jitsiContainerRef}>
        {!api && (
          <div className="h-full flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-white">Connecting to classroom...</p>
            </div>
          </div>
        )}
      </div>

        {/* Floating Chat Toggle Button */}
        <button
          onClick={toggleChat}
          className={`fixed bottom-8 left-24 w-14 h-14 flex items-center justify-center bg-purple text-white rounded-full shadow-lg cursor-pointer z-50 ${
            isChatOpen ? 'opacity-75' : ''
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={isChatOpen 
                ? "M6 18L18 6M6 6l12 12" 
                : "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              } 
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default JitsiMeetOptimized;