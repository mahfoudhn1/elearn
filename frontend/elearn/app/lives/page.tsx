
'use client'
import React from 'react';
import JitsiMeetComponent from './JitsiMeetComponent';
import { useSearchParams } from 'next/navigation';
import NoteTakingApp from './notes';

const App: React.FC = () => {
  // Get roomId from URL or props
  const query = useSearchParams();
  const roomId = query.get("roomId");
  
    
  return (
    <div className="App">
      <NoteTakingApp/>
      <JitsiMeetComponent roomId={roomId} />
    </div>
  );
};

export default App;