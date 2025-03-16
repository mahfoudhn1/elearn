"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axiosClientInstance from "../lib/axiosInstance";
import NoteTakingApp from "./notes";

// Declare JitsiMeetExternalAPI type globally
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const StartLive = () => {
  const [roomData, setRoomData] = useState<{
    room: string;
    token: string;
    domain: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = useSearchParams();
  const roomId = query.get("roomId");

  // Fetch meeting data when roomId changes
  useEffect(() => {
    if (!roomId) return;

    const getRoom = async () => {
      try {
        // Adjust endpoint to match your backend (assuming /meetings/ is correct)
        const response = await axiosClientInstance.get(`/meetings/${roomId}/start_meeting/`);
        const { room, token, domain } = response.data;
        setRoomData({ room, token, domain });
      } catch (error) {
        console.error("Error starting the live session:", error);
        setError("Failed to start the meeting. Please try again.");
      }
    };

    getRoom();
  }, [roomId]);

  // Initialize Jitsi meeting when roomData is available
  useEffect(() => {
    if (!roomData || !window.JitsiMeetExternalAPI) return;

    const { room, token, domain } = roomData;
    const jitsiDomain = domain.replace("https://", ""); // Remove protocol for Jitsi API

    const options = {
      roomName: room,
      parentNode: document.getElementById("jitsi-container"),
      jwt: token,
      width: "100%",
      height: "100vh",
      configOverwrite: {
        prejoinPageEnabled: false,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
      },
      interfaceConfigOverwrite: {
        filmStripOnly: false,
      },
    };

    const api = new window.JitsiMeetExternalAPI(jitsiDomain, options);
    api.executeCommand("displayName", "Teacher");

    // Cleanup Jitsi instance on unmount
    return () => {
      api.dispose();
    };
  }, [roomData]);

  // Loading and error states
  if (!roomData && !error) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div id="jitsi-container" className="w-full h-screen" />
          <div className="relative">
              <NoteTakingApp />
            </div>
    </div>
  );
};

export default StartLive;