"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

interface Notification {
  id: number;
  message: string;
  timestamp: number;
  type?: 'info' | 'warning' | 'error';
}

interface WebSocketContextProps {
  notifications: Notification[];
  clearNotification: (id: number) => void;
  clearAllNotifications: () => void;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

const WebSocketContext = createContext<WebSocketContextProps | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [wsInstance, setWsInstance] = useState<WebSocket | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const clearNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const connectWebSocket = useCallback(() => {
    const isHttps = window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss://' : 'ws://';
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || `${wsProtocol}${window.location.host}`;
    const wsUrl = `wss://riffaa.com//riffaa/ws/notifications/`
    setConnectionStatus('connecting');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setConnectionStatus('connected');
      setRetryCount(0);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📩 Received:", data);
    
        // 🏓 Respond to ping
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return; // Don't treat ping as a normal notification
        }
    
        const newNotification: Notification = {
          id: Date.now(),
          message: data.message,
          timestamp: Date.now(),
          type: data.type || 'info'
        };
    
        setNotifications(prev => [...prev, newNotification]);
    
        // Auto-remove notification after delay
        const removeDelay = data.duration || 5000;
        setTimeout(() => {
          clearNotification(newNotification.id);
        }, removeDelay);
      } catch (error) {
        console.error("❌ Error parsing message:", error);
      }
    };
    

    ws.onclose = () => {
      console.log("🔴 WebSocket disconnected");
      setConnectionStatus('disconnected');
      
      // Exponential backoff reconnection
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        connectWebSocket();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error("⚠️ WebSocket error:", error);
    };

    setWsInstance(ws);
  }, [retryCount, clearNotification]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsInstance) {
        wsInstance.close();
      }
    };
  }, [connectWebSocket]);

  const contextValue: WebSocketContextProps = {
    notifications,
    clearNotification,
    clearAllNotifications,
    connectionStatus
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within a WebSocketProvider");
  }
  return context;
};