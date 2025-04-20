"use client"
import React, { createContext, useContext, useEffect, useState } from "react";

interface WebSocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  ws: null,
  isConnected: false,
});

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const connectWebSocket = () => {
    // Determine protocol (ws/wss) based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}${window.location.host}`;
    
    const socket = new WebSocket(`${baseUrl}/ws/notifications/`);

    socket.onopen = () => {
      console.log("🔗 WebSocket connected!");
      setIsConnected(true);
      setRetryCount(0); // Reset retry counter on successful connection
    };

    socket.onclose = () => {
      console.log("❌ WebSocket disconnected!");
      setIsConnected(false);
      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s delay
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        connectWebSocket();
      }, delay);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent("NEW_NOTIFICATION", { detail: data }));
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    setWs(socket);
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <WebSocketContext.Provider value={{ ws, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);