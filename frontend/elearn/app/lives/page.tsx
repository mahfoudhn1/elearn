"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axiosClientInstance from "../lib/axiosInstance";
import JitsiMeetingComponent from "./JistiMeeting";

interface Room {
  room_name: string;
  start_time: string;
  end_time: string;
}

export default function Meeting() {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomId) {
        setError("No room ID provided");
        setLoading(false);
        return;
      }

      try {
        const {data} = await axiosClientInstance.get(`/live/${roomId}/get_room_and_token/`);
        if (data) {
          setRoom(data.meeting);
          console.log(room);
          
        } else {
          setError("Room not found");
        }
      } catch (error) {
        console.error("Error fetching room data:", error);
        setError("Failed to fetch room data");
      } finally {
        setLoading(false);
      }
    };


    fetchRoom();
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p>Loading meeting room...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded">
        {error || "Room not found"}
      </div>
    );
  }

  return (
    <div className="w-full">
      <JitsiMeetingComponent
        roomName={room.room_name}
        displayName={user?.first_name || "Guest"}
        email={user?.email || "guest@example.com"}
        onMeetingJoined={() => {
          console.log("User joined the meeting");
        }}
        onMeetingLeft={() => {
          console.log("User left the meeting");
        }}
        height="600px"
      />
    </div>
  );
}