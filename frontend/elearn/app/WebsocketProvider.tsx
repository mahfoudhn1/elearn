"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

interface Notification {
  id: string;
  message: string;
  timestamp: number;
  type: string;
  [key: string]: any; // Allow extra backend fields (subscription_id, etc.)
}

interface WebSocketContextProps {
  notifications: Notification[];
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  connectionStatus: "connected" | "disconnected" | "connecting";
}

const WebSocketContext = createContext<WebSocketContextProps | undefined>(
  undefined
);



export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [wsInstance, setWsInstance] = useState<WebSocket | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);


  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated) return; // 🚫 do nothing if logged out

    const isHttps = window.location.protocol === "https:";
    const wsProtocol = isHttps ? "wss://" : "ws://";
    const baseUrl =
      process.env.NEXT_PUBLIC_WS_URL || `${wsProtocol}${window.location.host}`;
    const wsUrl = `${baseUrl}/ws/notifications/`;

    setConnectionStatus("connecting");
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setConnectionStatus("connected");
      setRetryCount(0);
    };

    ws.onmessage = (event: MessageEvent) => {
      // ... your message parsing logic
    };

    ws.onclose = () => {
      console.log("🔴 WebSocket disconnected");
      setConnectionStatus("disconnected");

      // Only retry if still authenticated
      if (isAuthenticated) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          connectWebSocket();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error("⚠️ WebSocket error:", error);
    };

    setWsInstance(ws);
  }, [retryCount, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      connectWebSocket();
    } else {
      // user logged out → close socket immediately
      wsInstance?.close();
      setWsInstance(null);
      setConnectionStatus("disconnected");
    }

    return () => {
      wsInstance?.close();
    };
  }, [isAuthenticated, connectWebSocket]);

  const contextValue: WebSocketContextProps = {
    notifications,
    clearNotification,
    clearAllNotifications,
    connectionStatus,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
