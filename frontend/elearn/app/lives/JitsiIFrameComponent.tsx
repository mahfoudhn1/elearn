import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface JitsiIFrameComponentProps {
  meetingData: {
    domain?: string;
    room?: string;
    token?: string;
  };
  role?: string;
  displayName?: string;
}

const JitsiIFrameComponent: React.FC<JitsiIFrameComponentProps> = ({ meetingData, role, displayName }) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!meetingData || !meetingData.domain || !meetingData.room || !jitsiContainerRef.current) {
      return;
    }

    const script = document.createElement('script');
    script.src = `https://${meetingData.domain}/external_api.js`;
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      try {
        const options = {
          roomName: meetingData.room,
          width: '100%',
          height: '100%',
          parentNode: jitsiContainerRef.current,
          jwt: meetingData.token,
          userInfo: {
            displayName: displayName,
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            defaultLanguage: 'ar',
          },
          interfaceConfigOverwrite: {
            LANG_DETECTION: false,
          },
        };

        // @ts-ignore
        const api = new window.JitsiMeetExternalAPI(meetingData.domain, options);

        api.addEventListener('videoConferenceLeft', () => {
          if (role === 'teacher') {
            router.push('/groups/allgroups/');
          }
        });

        return () => {
          api.dispose();
          document.body.removeChild(script);
        };
      } catch (error) {
        console.error('Failed to initialize Jitsi Meet API:', error);
      }
    };
  }, [meetingData, displayName, role, router]);

  return <div ref={jitsiContainerRef} style={{ height: '100%', width: '100%' }} />;
};

export default JitsiIFrameComponent;
