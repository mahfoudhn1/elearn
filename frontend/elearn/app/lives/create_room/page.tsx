"use client"
import React, { useState } from 'react';
import axiosClientInstance from '../../lib/axiosInstance';

const CreateMeeting: React.FC = () => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    try {
      const response = await axiosClientInstance.post('/live/create_room/');
      setRoomId(response.data.meeting_id);
    } catch (err) {
      setError('Failed to create the room.');
    }
  };

  return (
    <div>
      <button onClick={createRoom}>Create Room</button>

      {error && <p>{error}</p>}

      {roomId && (
        <div>
          <h2>Meeting Room Created!</h2>
          <a href={`/lives?roomId=${roomId}`} target="_blank" rel="noopener noreferrer">
            Join Room
          </a>
        </div>
      )}
    </div>
  );
};

export default CreateMeeting;
