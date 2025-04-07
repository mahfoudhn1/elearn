"use client"
import { useState } from "react";
import NotificationPopup from "./notificationpopup";
import useWebSocket from "../hooks/useWebsocket";

const GlobalNotifications = () => {
    const [notifications, setNotifications] = useState<{ id: number; message: string }[]>([]);
    const getWebSocketUrl = () => {
        if (process.env.NEXT_PUBLIC_WS_URL) {
          return process.env.NEXT_PUBLIC_WS_URL;
        }
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        return `${protocol}${window.location.host}/riffaa/ws/notifications/`;
      };
    
    useWebSocket(getWebSocketUrl(), (message:any) => {
        const newNotification = { id: Date.now(), message: message.message };
        setNotifications((prev) => [...prev, newNotification]);
    });

    return (
        <div className="fixed top-0 right-0 z-50">
            {notifications.map((msg) => (
                <NotificationPopup
                    key={msg.id}
                    message={msg.message}
                    onClose={() => setNotifications((prev) => prev.filter((n) => n.id !== msg.id))}
                />
            ))}
        </div>
    );
};

export default GlobalNotifications;