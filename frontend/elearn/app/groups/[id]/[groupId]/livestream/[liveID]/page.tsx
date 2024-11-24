"use client";
import React, { useState, useEffect } from 'react';
import ZoomMeeting from './ZoomLiveStream';
import { useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../store/store';
import axiosClientInstance from '../../../../../lib/axiosInstance';
import { cp } from 'fs';
import Videosdk from './zoomvideosdk';

const ZoomMeetingPage = () => {
  const [teacherId, setTeacherId] = useState("");
  const user = useSelector((state: RootState) => state.auth.user);
  const [signature, setSignature] = useState("");
  const params = useParams();
  const [meetingID, setMeetingID] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [zoomToken, setZoomToken] = useState('')
  const schID = params.liveID;
  

  useEffect(() => {
        fetchSchedule();
      if(user?.role === 'teacher'){
        fetchZoomTooken();
      }
  }, [params.groupId, schID]);

  const fetchSchedule = async () => {
    try {
      const res = await axiosClientInstance.get(`/groups/schedules/${schID}/`,{
        params:{
          group_id : params.groupId
        }
      });
      console.log(res);
      
      const zoomId = res.data.zoom_meeting_id
      setMeetingID(zoomId);
      const url = res.data.zoom_join_url;
      const match = url.match(/pwd=([^&]+)/);
      const pwdValue = match ? match[1] : null;
      setSecretCode(pwdValue);
      fetchGroupAndSignature(zoomId)
    } catch (error) {
      console.error("Error fetching schedule:", error);
    }
  };

  
  
  const fetchGroupAndSignature = async (id:string) => {
    try {
      const res = await axiosClientInstance.get(`/groups/${params.groupId}/`);
      const fetchedTeacherId = res.data.admin;
      console.log(fetchedTeacherId);
        
      const signatureRes = await axiosClientInstance.post(`/livestream/signiture/`, {
        meeting_number: id,
        teacher_id: fetchedTeacherId,
      });
      if (signatureRes.data) {        
        setSignature(signatureRes.data.signature);
      }
    } catch (error) {
      console.error("Error fetching group and signature:", error);
    }
  };

  const fetchZoomTooken=async()=>{
    try{
      const res = await axiosClientInstance.get('/livestream/oauth/get_zak_token/')
      const token = res.data.zak_token
      setZoomToken(token)
    }catch(error){
      alert("قم بربط حسابك zoom")      
    }
  }

  return (
    <div className="bg-gray-100 p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex">
          {/* Left column */}
          <div className="w-3/4 p-6">
            <div className="relative">
            <ZoomMeeting 
                meetingID={meetingID} 
                signiture={signature} 
                userName={user?.username} 
                userEmail={user?.email} 
                secret={secretCode} 
                zk={zoomToken}
              />

       
            </div>
            {/* <FlashcardSection /> */}
          </div>

          {/* Right column */}

        </div>
      </div>
    </div>
    // <div className="container mx-auto">
    //   <h1 className="text-2xl font-bold mb-4">Zoom Meeting</h1>


    //     {/* <Videosdk/> */}
    // </div>
  );
};

export default ZoomMeetingPage;
