import React, { useEffect, useState } from 'react';
import ZoomMtgEmbedded from '@zoom/meetingsdk/embedded'

interface ZoomMeetingProps {
  meetingID:string;
  signiture:string;
  secret:string;
  userName?: string;
  userEmail?:string;
  zk?:string
}



const ZoomMeeting:React.FC<ZoomMeetingProps> = ({meetingID, signiture, userName, userEmail, secret, zk}) => {
  const apiKey = process.env.NEXT_PUBLIC_ZOOM_SDK_ID // Ensure this is set in .env.local



  useEffect(() => {
    if(signiture && userName && userEmail){
      startMeeting(signiture)  
    }
      // genSignature()
  }, [meetingID, apiKey, userName, signiture]);

  
  const startMeeting = (signature: string) => {
    const client = ZoomMtgEmbedded.createClient()

    let meetingSDKElement = document.getElementById('meetingSDKElement')
    if (meetingSDKElement) {
      client.init({
        zoomAppRoot: meetingSDKElement as HTMLElement, // Cast to HTMLElement to avoid errors
        language: 'en-US',
        
      })}
   
    client.join({
      signature: signature,  // Pass the signature generated from your backend
      sdkKey: apiKey,        // Pass your Zoom SDK key
      meetingNumber: meetingID,  // The Zoom meeting ID
      password: secret, // Meeting password (if applicable)
      userName: userName || 'Guest',   // Fallback to 'Guest' if no username is provided
      userEmail: userEmail || '',      // Fallback to empty string if no email is provided
      tk: '',  // Optional token (leave empty if not required)
      zak: zk || '', // Optional zak token (leave empty if not required)
      success: (result: any) => {
        console.log('Zoom Meeting joined successfully:', result);

      },
      error: (error: any) => {
        console.error('Error joining Zoom Meeting:', error);
      },
    });
  }
    
 

  
  return (
    <div>
      <h1>Zoom Meeting</h1>
      <div id="meetingSDKElement" />
    </div>
  );
};

export default ZoomMeeting;
