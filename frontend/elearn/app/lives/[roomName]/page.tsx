"use client"
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react';
import axiosClientInstance from '../../lib/axiosInstance';

const LiveStreamPage = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const room = searchParams.get('room')
    const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    if (room) {

      const fetchJoinUrl = async () => {
        const response = await  axiosClientInstance.post(`/live/join-meeting?room=${room}`);
        const data = await response.data();

        if (response.data) {
          setJoinUrl(data.join_url);
        } else {
          alert(data.error || 'Failed to join the meeting');
        }
      };

      fetchJoinUrl();
    }
  }, [room]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-dark to-gray-800 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8 text-white">Live Streaming</h1>
      <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-6xl border border-white/20">
        {joinUrl ? (
          <iframe
            src={joinUrl}
            className="w-full h-[600px] rounded-lg shadow-lg"
            allow="camera; microphone; fullscreen; display-capture"
          />
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <div className="animate-pulse text-white text-xl">Loading live stream...</div>
          </div>
        )}
      </div>
      <div className="mt-8">
        <button
          onClick={() => router.push('/start-live')}
          className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple transition duration-200 transform hover:scale-105 active:scale-95"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default LiveStreamPage;