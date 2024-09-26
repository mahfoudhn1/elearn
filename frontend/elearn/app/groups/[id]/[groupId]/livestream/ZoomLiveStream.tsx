import React, { useEffect, useState } from 'react';
import { ZoomMtg } from "@zoom/meetingsdk";

interface ZoomMeetingProps {
  meetingID:string;
  role:string;
  signiture:string;
  userName?: string;
  userEmail?:string;
}


const ZoomMeeting:React.FC<ZoomMeetingProps> = ({meetingID, role, signiture, userName, userEmail}) => {
  const apiKey = process.env.ZOOM_SDK_ID as string // Ensure this is set in .env.local



  useEffect(() => {
    if(signiture && userName && userEmail){
      startMeeting(signiture)  
    }
      // genSignature()
  }, [meetingID, role, apiKey, userName, signiture]);

  
  // const genSignature = (role: string = '0')=> {
  //   ZoomMtg.generateSDKSignature({
  //     meetingNumber:meetingID,
  //     role: role, // 1 for hosting
  //     sdkKey: apiKey,
  //     sdkSecret: apiSecret,
  //     success: (signature: any) => {
  //       console.log(signature);
  //       startMeeting(signature);
  //     },
  //     error: (error: any) => {
  //       console.log('generateSDKSignature error', error);
  //     },
  //   });
  // }



  const startMeeting = (signature: string) => {
    ZoomMtg.init({
      leaveUrl: 'http://localhost:3000',
      patchJsMedia: true,
      success: (success: any) => {
        console.log('Zoom Meeting init success:', signature);
        ZoomMtg.join({
          signature: signature,  // Pass the signature generated from your backend
          sdkKey: apiKey,        // Pass your Zoom SDK key
          meetingNumber: meetingID,  // The Zoom meeting ID
          passWord: 'eeCb85o2AYEAdFWXQYcbYlWQgWry4I.1', // Meeting password (if applicable)
          userName: userName || 'Guest',   // Fallback to 'Guest' if no username is provided
          userEmail: userEmail || '',      // Fallback to empty string if no email is provided
          tk: '',  // Optional token (leave empty if not required)
          zak: '', // Optional zak token (leave empty if not required)
          success: (result: any) => {
            console.log('Zoom Meeting joined successfully:', result);
          },
          error: (error: any) => {
            console.error('Error joining Zoom Meeting:', error);
          },
        });
      },
      error: (error: any) => {
        console.error('Error initializing Zoom Meeting:', error);
      },
    });
  };




  
  return (
    <div>
      <h1>Zoom Meeting</h1>
      <div id="zmmtg-root" />
    </div>
  );
};

export default ZoomMeeting;
