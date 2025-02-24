"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axiosClientInstance from "../lib/axiosInstance";


declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}


const StartLive = () => {
  const [room, setRoom] = useState<any>(null);
  const query = useSearchParams();
  const roomID = query.get("roomId");
  console.log(roomID);
  
  useEffect(() => {
    if (roomID) {
      const getRoom = async () => {
        try {
          const response = await axiosClientInstance.get(`/live/${roomID}/start_meeting/`);
          const data = response.data;
          setRoom(data);
        } catch (error) {
          console.error("Error starting the live session:", error);
        }
      };

      getRoom();
    }
  }, [roomID]);

  useEffect(() => {
    if (room && room.room && room.token) {
      const domain = room.domain.replace("https://", ""); // Jitsi needs domain only
      const options = {
        roomName: room.room,
        parentNode: document.getElementById("jitsi-container"),
        jwt: room.token, // Pass the Jitsi token
        width: "100%",
        height: "100vh",
        configOverwrite: {
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          filmStripOnly: false,
        },
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      
      api.executeCommand("displayName", "Teacher"); // Example: Set the display name
    }
  }, [room]);

  if (!room) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div id="jitsi-container" className="w-full h-screen"></div>
    </div>
  );
};

export default StartLive;

