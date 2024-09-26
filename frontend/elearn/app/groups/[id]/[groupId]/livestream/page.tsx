"use client"
import React, { useState, useEffect } from 'react';
import ZoomMeeting from './ZoomLiveStream';
import axiosClientInstance from '../../../../lib/axiosInstance';
import { useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store/store';


const ZoomMeetingPage = () => {
  const [teacherId, setTeacherId] = useState("")
  const user = useSelector((state:RootState)=>state.auth.user)
  // const [meetingNumber, setMeetingNumber] = useState('')
  const [signature, setSignature] = useState("")
  const params = useParams()

  useEffect(() => {
    const fetchGroupAndSignature = async () => {
      try {
        // Fetch group info
        const res = await axiosClientInstance.get(`/groups/${params.groupId}/`)
        const fetchedTeacherId = res.data.admin
        setTeacherId(fetchedTeacherId)
        console.log(res.data.admin);
        
        if(res.data){
          const signatureRes = await axiosClientInstance.post(`/livestream/signiture/`, {
            meeting_number: "84923275510",
            teacher_id: fetchedTeacherId,
            role: "0",
          })
          
          if (signatureRes.data) {
            setSignature(signatureRes.data.signature)
          }
        }
      } catch (error) {
        console.log(error)
      }
    }

    if (params.groupId) {
      fetchGroupAndSignature()
    }
  }, [params.groupId])


  
  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-4">Zoom Meeting</h1>
      <ZoomMeeting meetingID={"84923275510"} role={"0"} signiture={signature} userName={user?.username} userEmail={user?.email} />
    </div>
  );
};

export default ZoomMeetingPage;