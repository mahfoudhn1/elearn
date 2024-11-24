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
    let meetingSDKChatElement = document.getElementById('meetingSDKChatElement')

    if (meetingSDKElement) {
      client.init({
        zoomAppRoot: meetingSDKElement as HTMLElement, // Cast to HTMLElement to avoid errors
        language: 'en-US',
        customize: {
          video: {
            isResizable: true,
            viewSizes: {
              default: {
                width: 1300,
                height: 700
              },
              ribbon: {
                width: 700,
                height: 300
              }
            },

          },
          chat: {
            popper: {
              disableDraggable: false,
              anchorElement: meetingSDKChatElement,
              
            },
          }}
        
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
    }).then(()=>{
      

    })
  }
    


  
  return (
    <div>
      <h1>Zoom Meeting</h1>
      <div className="flex justify-between">
        <div id="meetingSDKElement" />
        <div id="meetingSDKChatElement" ></div>
        <div>
  

        </div>
      </div>
    </div>
  );
};

export default ZoomMeeting;
