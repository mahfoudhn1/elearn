"use client"
import React, { createContext, useContext, useEffect, useState } from "react";

const WebSocketContext = createContext<WebSocket | null>(null);

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket(`ws://${process.env.BASE_API_URL}/ws/notifications/`);

        socket.onopen = () => console.log("🔗 WebSocket connected!");
        socket.onclose = () => console.log("❌ WebSocket disconnected!");
        socket.onerror = (error) => console.error("WebSocket error:", error);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            
            window.dispatchEvent(new CustomEvent("NEW_NOTIFICATION", { detail: data }));
        };

        setWs(socket);

        return () => socket.close();
    }, []);

    return (
        <WebSocketContext.Provider value={ws}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => useContext(WebSocketContext);
