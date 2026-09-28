"use client";
import { useState } from "react";
import NotificationPopup from "./notificationpopup";
import useWebSocket from "../hooks/useWebsocket";

interface NotificationPayload {
  id: string;
  type: string; // "meeting_start" | "meeting_end" | other
  message: any;
  room_id?: string;
  [key: string]: any;
}

const GlobalNotifications = () => {
  const [notifications, setNotifications] = useState<
    { id: string; data: NotificationPayload }[]
  >([]);
  const [activeMeeting, setActiveMeeting] = useState<NotificationPayload | null>(
    null
  );

  useWebSocket(
    "wss://riffaa.com/riffaa/ws/notifications/",
    (data: NotificationPayload) => {
      // Handle meeting start/end separately
      if (data.type === "meeting_start") {
        setActiveMeeting(data); // show sticky banner
      } else if (data.type === "meeting_end") {
        setActiveMeeting(null); // remove sticky banner
      } else {
        // Normal notifications
        const newNotification = { id: String(Date.now()), data };
        setNotifications((prev) => [...prev, newNotification]);
      }
    }
  );

  return (
    <div className="fixed top-0 right-0 z-50 w-full flex flex-col items-end">
     
      {/* {activeMeeting && (
        <div className="w-full bg-red-600 text-white text-center py-3 font-bold shadow-md">
          🎥 {activeMeeting.message}
        </div>
      )} */}


      {/* {notifications.map((notif) => (
        <NotificationPopup
          key={notif.id}
          message={notif.data.message}
          onClose={() =>
            setNotifications((prev) =>
              prev.filter((n) => n.id !== notif.id)
            )
          }
        />
      ))} */}
    </div>
  );
};

export default GlobalNotifications;
