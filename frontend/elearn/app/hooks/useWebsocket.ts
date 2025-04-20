import { useEffect, useRef } from "react";

const useWebSocket = (url: string, onMessage: (message: any) => void) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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
          console.log("📩 Received WebSocket message:", data);

          // Handle ping
          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }

          // Validate message
          if (!data || typeof data !== "object" || typeof data.message !== "string") {
            console.error("❌ Invalid message format:", data);
            return;
          }

          onMessage(data.message);
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("🔴 WebSocket closed");
        // Attempt reconnect with exponential backoff
        reconnectTimeoutRef.current = setTimeout(connect, 1000);
      };

      ws.onerror = (error) => {
        console.error("⚠️ WebSocket error:", error);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url, onMessage]);

  return wsRef.current;
};

export default useWebSocket;