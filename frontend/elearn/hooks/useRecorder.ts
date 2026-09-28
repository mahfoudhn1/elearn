
'use client';

import { useState, useRef, useEffect } from 'react';

export function useStreamRecorder(stream: MediaStream | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (!stream) return;

    setIsRecording(true);
    setError(null);
    recordedChunksRef.current = []; // Clear previous chunks

    try {
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });

      // 1. Collect all video chunks in an array
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // 2. When recording stops, create a single Blob and download it
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: 'video/webm'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `recording-${new Date().toISOString()}.webm`;
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setIsRecording(false);
        console.log("Recording finished and downloaded.");
      };
      
      // Handle stream ending (e.g., user clicks "Stop sharing")
      stream.getTracks().forEach(track => {
        track.onended = () => stopRecording();
      });

      mediaRecorderRef.current.start(1000); // Collect chunks every second
      console.log("Recording to local memory started.");

    } catch (err) {
      setError('Failed to start recording.');
      console.error("Start recording error:", err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    stream?.getTracks().forEach(track => track.stop());
  };
  
  useEffect(() => {
    if (stream && !isRecording) {
        startRecording();
    }
  }, [stream]);

  return { isRecording, error, stopRecording };
}
