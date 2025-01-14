"use client";
import React, { useEffect, useState } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

// Define comprehensive types for better type safety
interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  email: string;
  onMeetingJoined?: () => void;
  onMeetingLeft?: () => void;
  height?: string;
}

interface JitsiConfig {
  startWithAudioMuted: boolean;
  startWithVideoMuted?: boolean;
  disableModeratorIndicator?: boolean;
  enableClosePage?: boolean;
  prejoinPageEnabled?: boolean;
}

const DEFAULT_CONFIG: JitsiConfig = {
  startWithAudioMuted: true,
  startWithVideoMuted: false,
  disableModeratorIndicator: true,
  enableClosePage: true,
  prejoinPageEnabled: true,
};

const JitsiMeetingComponent: React.FC<JitsiMeetingProps> = ({
  roomName,
  displayName,
  email,
  onMeetingJoined,
  onMeetingLeft,
  height = "500px"
}) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJitsiScript = () => {
      try {
        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        
        script.onload = () => {
          console.log("Jitsi script loaded successfully");
          setIsScriptLoaded(true);
        };
        
        script.onerror = () => {
          setError("Failed to load Jitsi script");
          console.error("Failed to load Jitsi script");
        };
        
        document.body.appendChild(script);

        return () => {
          document.body.removeChild(script);
        };
      } catch (err) {
        setError("Error initializing Jitsi script");
        console.error("Error initializing Jitsi:", err);
      }
    };

    loadJitsiScript();
  }, []);

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded">
        Error: {error}
      </div>
    );
  }

  if (!isScriptLoaded) {
    return (
      <div className="p-4">
        Loading Jitsi meeting...
      </div>
    );
  }

  if (!roomName || !displayName || !email) {
    return (
      <div className="p-4 text-yellow-600 bg-yellow-50 rounded">
        Missing required parameters for meeting
      </div>
    );
  }

  return (
    <div className="w-full">
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        configOverwrite={DEFAULT_CONFIG}
        userInfo={{
          displayName,
          email,
        }}
        onApiReady={(externalApi) => {
          // Set up event listeners
          externalApi.addEventListener("videoConferenceJoined", () => {
            console.log("Meeting joined");
            onMeetingJoined?.();
          });

          externalApi.addEventListener("videoConferenceLeft", () => {
            console.log("Meeting left");
            onMeetingLeft?.();
          });

          externalApi.addEventListener("participantLeft", () => {
            console.log("Participant left");
          });
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = height;
        }}
      />
    </div>
  );
};

export default JitsiMeetingComponent;