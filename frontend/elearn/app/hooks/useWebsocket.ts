import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

const useWebSocket = (url: string, onMessage: (message: any) => void) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  useEffect(() => {
    if (!isAuthenticated) {
      // 🔑 User logged out → close socket & cancel reconnect
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    const connect = () => {
      console.log("🔗 Connecting to WebSocket:", url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          // handle ping/pong
          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }

          // validate message
          if (
            !data ||
            typeof data !== "object" ||
            (
              typeof data.message !== "string" &&
              (
                typeof data.message !== "object" ||
                typeof data.message.message !== "string"
              )
            )
          ) {
            console.error("❌ Invalid message format:", data);
            return;
          }

          onMessage(data);
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("🔴 WebSocket closed");
        // 🔄 reconnect only if still authenticated
        if (isAuthenticated) {
          reconnectTimeoutRef.current = setTimeout(connect, 1000);
        }
      };

      ws.onerror = (error) => {
        console.error("⚠️ WebSocket error:", error);
      };
    };

    connect();


    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [url, onMessage, isAuthenticated]);

  return wsRef.current;
};

export default useWebSocket;
