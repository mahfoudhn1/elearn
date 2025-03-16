import { useEffect, useState, useRef } from "react";

const useWebSocket = (url: string, onMessage: (message: string) => void) => {
    useEffect(() => {
        const ws = new WebSocket(url);

        ws.onopen = () => console.log("✅ WebSocket connected");
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessage(data.message);
            } catch (error) {
                console.error("❌ WebSocket error:", error);
            }
        };
        ws.onclose = () => console.log("🔴 WebSocket closed");
        ws.onerror = (error) => console.error("⚠️ WebSocket error:", error);

        return () => ws.close();
    }, [url, onMessage]);
};


export default useWebSocket;
