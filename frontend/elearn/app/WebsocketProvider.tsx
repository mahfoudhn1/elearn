"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface Notification {
    id: number;
    message: string;
}

interface WebSocketContextProps {
    notifications: Notification[];
}

const WebSocketContext = createContext<WebSocketContextProps | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const ws = new WebSocket(`ws://${process.env.BASE_API_URL}/ws/notifications/`);

        ws.onopen = () => console.log("✅ WebSocket connected");

        ws.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                console.log("📩 Received:", data);

                setNotifications((prev) => [
                    ...prev,
                    { id: Date.now(), message: data.message },
                ]);

                // Auto-remove notification after 5 seconds
                setTimeout(() => {
                    setNotifications((prev) =>
                        prev.filter((msg) => msg.id !== Date.now())
                    );
                }, 5000);
            } catch (error) {
                console.error("❌ Error parsing message:", error);
            }
        };

        ws.onclose = () => console.log("🔴 WebSocket disconnected");
        ws.onerror = (error) => console.error("⚠️ WebSocket error:", error);

        return () => ws.close();
    }, []);

    return (
        <WebSocketContext.Provider value={{ notifications }}>
            {children}
        </WebSocketContext.Provider>
    );
};

// Custom hook to use WebSocket context
export const useWebSocketContext = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error("useWebSocketContext must be used within a WebSocketProvider");
    }
    return context;
};