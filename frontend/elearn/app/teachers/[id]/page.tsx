"use client"
import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUniversity, faChalkboardTeacher, faLocationPin } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store/store';
;
import { useSelector } from 'react-redux';
import axiosClientInstance from '../../lib/axiosInstance';
import ConfirmationPage from './components/confirmationpage';
import { PlanComponent } from './components/plans';
import { Group, Teacher } from '../../types/student';
import TeacherGroups from './components/groups';
import Sidebar from '../../components/dahsboardcomponents/sidebar';
import { useRouter } from 'next/navigation';






interface TeacherProps {
  params: {
    id: string; 
  };
}

const Profile: React.FC<TeacherProps> = ({ params }) => {
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [teacher, setTeacher] = useState<Teacher | null>(null); 
  const currentUser = useSelector((state: RootState) => state.auth.user); 
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribedActive, setIsSubscribedActive] = useState(false);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [groups, setGroups] = useState<Group[]>([])

  const targetDivRef = useRef<HTMLDivElement>(null);
  const handleSubscribeClick = () => {

    // Scroll to the target div
    if (targetDivRef.current) {
      targetDivRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const response = await axiosClientInstance.get<Teacher>(`http://localhost:8000/api/teachers/${params.id}/`);
        setTeacher(response.data);
        
        // Fetch groups after teacher data is set
        await fetchGroups(response.data.id);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
  
    const fetchGroups = async (teacherId: number) => {
      try {
        const response = await axiosClientInstance.get('/groups/profile_groups/', {
          params: {
            teacher_id: teacherId
          }
        });

        
        setGroups(response.data);
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      }
    };
  
    const checkSubscriptionStatus = async () => {
      try {
        const response = await axiosClientInstance.get('/subscriptions/subscriptions/'); 
        const subscriptions = response.data;    
        
        const isAlreadySubscribed = subscriptions.some((sub: any) => 
          sub.teacher.id == params.id
        );
  
        setIsSubscribed(isAlreadySubscribed);
        const isAlreadySubscribedActive = subscriptions.some((sub: any) => 
          sub.teacher.id === params.id && sub.is_active
        );
  
        setIsSubscribedActive(isAlreadySubscribedActive);
      } catch (error) {
        console.error('Failed to fetch subscriptions:', error);
      }
    };
  
    fetchTeacher();
    checkSubscriptionStatus();
  }, [params.id]);

  

  const isOwner = currentUser && teacher && currentUser.id === teacher.user.id; 

  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
    setShowConfirmation(true); 
  };

  const router = useRouter()
  const handleConfirm = (id:any) => {
    
    setShowConfirmation(false);
    router.push(`/subscriptions/${id}`)
    // window.location.reload();
  };

  const handleClosePopup = () => {
    setPopupVisible(false); // Close the popup
  };
    const handlePrivet = (id:number)=>{
      router.push(`/teachers/${id}/privetseassion/`)
    }

  return (
    <div className='flex flex-row relative'>
      <div className="md:p-16 p-8 w-full justify-center">
        <div className="p-8 bg-white shadow mt-24">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="grid text-center order-last md:order-first mt-20 md:mt-0">
              <div className='text-center items-center mx-auto'>
                <p className="font-bold text-gray-700 text-xl">89</p>
                <p className="text-gray-400 text-center">عدد الطلبة</p>
              </div>
            </div>
            <div className="relative">
              <div className="w-48 h-48 bg-indigo-100 mx-auto rounded-full shadow-2xl absolute overflow-hidden inset-x-0 top-0 -mt-24 flex items-center justify-center text-indigo-500">
                {teacher && teacher.user.avatar_file ? 
                  <img src={`${teacher.user.avatar_file}`} alt="Profile" className="object-cover rounded-full" />
                : 
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                }
              </div>
            </div>

            <div className="space-x-8 flex justify-between mt-32 md:mt-0 md:justify-center">
              {!isSubscribed && !isOwner && (
              <button
                className="text-white py-2 px-4 uppercase rounded bg-blue-400 hover:bg-blue-500 shadow hover:shadow-lg font-medium transition transform hover:-translate-y-0.5"
                onClick={() => handleSubscribeClick()}
              >
                التسجيل
              </button>
            )}
            {teacher && (
              <button
                className="text-white py-2 px-4 uppercase rounded bg-gray-700 hover:bg-gray-800 shadow hover:shadow-lg font-medium transition transform hover:-translate-y-0.5"
                onClick={()=>{handlePrivet(teacher?.id)}}
              >
                طلب حصة خاصة
              </button>
            )}
            </div>
          </div>

          <div className="mt-20 text-center border-b pb-12">
            <div>
              <h1 className="text-4xl font-medium text-gray-700">
                <span className="font-light text-gray-dark">الأستاذ: </span>
                {teacher?.user.first_name} {teacher?.user.last_name} 
              </h1>
              <p className="font-light text-gray-600 mt-3">
                <FontAwesomeIcon className='w-4 h-4 mx-2 text-gray' icon={faLocationPin} />
                {teacher?.wilaya} 
              </p>
            </div>
            <div className='flex flex-col mt-4 space-y-4 justify-center'>
              <div className='text-center flex justify-center'>
                <FontAwesomeIcon className='w-6 h-6 mx-2 text-gray' icon={faChalkboardTeacher} /> 
                <p className="text-gray-500">أستاذ {teacher?.teaching_subjects} </p>
              </div>
              <div className='text-center flex justify-center'>
                <FontAwesomeIcon className='w-6 h-6 mx-2 text-gray' icon={faUniversity} /> 
                <p className="text-gray-500">{teacher?.degree}- {teacher?.university}</p>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col justify-center">
          {!isSubscribed && !isOwner && (
            <p className="text-gray-600 text-center font-light lg:px-16">
              قم بالتسجيل لدى الأستاذ {teacher?.user.first_name} الآن واستفد من العديد من المزايا الرائعة!
            </p>
          )}
            <p className="text-gray-600 text-center font-light lg:px-16">
              {teacher?.bio}
            </p>
          </div>
  

          {/* {isOwner ? (
            <div className="profile-edit">
              <button>Edit Profile</button>
              <button>Create Group</button>
              <ZoomAuthButton/>
            </div>
          ) : (
            <button onClick={() => setPlanPopup(true)}>Subscribe</button>
          )} */}

          {isPopupVisible && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold text-gray-800">شكرا على التسجيل!</h2>
                <p className="mt-4 text-gray-600">شكر على التسجيل, سيتم الاتصال بك لتأكيد تسجيلك.</p>
                <button
                  onClick={handleClosePopup}
                  className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
                >
                  اغلاق
                </button>
              </div>
            </div>
          )}

          {!isSubscribed && !isOwner && (
            <div ref={targetDivRef} >
              <PlanComponent  onSelectPlan={handleSelectPlan}/>
            </div>
          )}
            <div >
              <TeacherGroups groups={groups}/>
            </div>
          {showConfirmation && (

            <ConfirmationPage
              teacherId={params.id}
              planId={selectedPlanId || 0}
              onConfirm={handleConfirm}
              onclose={() => setShowConfirmation(false)}
              />
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
