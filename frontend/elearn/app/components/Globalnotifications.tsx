"use client"
import { useState } from "react";
import NotificationPopup from "./notificationpopup";
import useWebSocket from "../hooks/useWebsocket";

const GlobalNotifications = () => {
    const [notifications, setNotifications] = useState<{ id: number; message: string }[]>([]);

    useWebSocket(`ws://${process.env.BASE_API_URL}/ws/notifications/`, (message:any) => {
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