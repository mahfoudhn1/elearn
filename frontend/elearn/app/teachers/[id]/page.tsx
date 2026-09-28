"use client";
import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUniversity,
  faChalkboardTeacher,
  faLocationPin,
  faStar,
  faPeopleGroup,
  faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import axiosClientInstance from "../../lib/axiosInstance";
import ConfirmationPage from "./components/confirmationpage";
import { PlanComponent } from "./components/plans";
import { Group, Teacher } from "../../types/student";
import TeacherGroups from "./components/groups";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface TeacherProps {
  params: {
    id: string;
  };
}

const Profile: React.FC<TeacherProps> = ({ params }) => {
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribedActive, setIsSubscribedActive] = useState(false);
  const [subscriptionsNumber, setSubscriptionsNumber] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const targetDivRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const response = await axiosClientInstance.get<Teacher>(
          `/teachers/${params.id}/`
        );
        setTeacher(response.data);
        await fetchGroups(response.data.id);
      } catch (error) {
        console.error("Error fetching teacher data:", error);
      }
    };

    const fetchGroups = async (teacherId: string) => {
      try {
        const response = await axiosClientInstance.get(
          "/groups/profile_groups/",
          {
            params: { teacher_id: teacherId },
          }
        );
        setGroups(response.data);
      } catch (error) {
        console.error("Failed to fetch groups:", error);
      }
    };

    const checkSubscriptionStatus = async () => {
      try {
        
        const { data: subscriptions } = await axiosClientInstance.get(
          "/subscriptions/subscriptions/by-teacher/",
          { params: { teacher_id: params.id } }
        );
    
        // Count
        setSubscriptionsNumber(subscriptions.length);
    
        // Is subscribed at all
        const isAlreadySubscribed = subscriptions.some(
          (sub: any) => sub.student.user.id === currentUser?.id
        );
        setIsSubscribed(isAlreadySubscribed);
    
        // Is actively subscribed
        const isAlreadySubscribedActive = subscriptions.some(
          (sub: any) => sub.student.user.id === currentUser?.id && sub.is_active
        );
        setIsSubscribedActive(isAlreadySubscribedActive);
    
      } catch (error) {
        console.error("Failed to fetch subscriptions:", error);
      }
    };
    
    fetchTeacher();
    checkSubscriptionStatus();
    
  }, [params.id]);

  const isOwner = currentUser && teacher && currentUser.id === teacher.user.id;

  const handleSubscribeClick = () => {
    if (targetDivRef.current) {
      targetDivRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setShowConfirmation(true);
  };

  const handleConfirm = (id: any) => {
    setShowConfirmation(false);
    router.push(`/subscriptions/${id}`);
  };

  const handleClosePopup = () => {
    setPopupVisible(false);
  };

  const handlePrivateSession = (id: string) => {
    router.push(`/teachers/${id}/privetseassion/`);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Hero Section */}
          <div className="relative bg-gradient-to-r from-blue-500 to-grey-900 h-64 flex items-center justify-center">
            <div className="absolute inset-0 bg-black opacity-20"></div>
            <div className="relative z-10 text-center text-white">
              <h1 className="text-4xl font-bold">
                الأستاذ: {teacher?.user.first_name} {teacher?.user.last_name}
              </h1>
              <p className="mt-2 text-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faLocationPin} className="ml-2" />
                {teacher?.wilaya}
              </p>
            </div>
          </div>

          {/* Profile Content */}
          <div className="relative -mt-20 px-6 sm:px-10">
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                {teacher && teacher.user.avatar ? (
                  <img
                    	src={teacher.user.avatar?.startsWith('/api/media/https%3A/lh3')
                        ? decodeURIComponent(teacher.user.avatar.replace('/api/media/', '')).replace(/^https:\//, 'https://')
                        : teacher.user.avatar_file}
 			alt={`${teacher.user.first_name} ${teacher.user.last_name}`}
                  	className="object-cover w-full"
                    	
 		    />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-gray-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="flex justify-center  text-gray-600">
                <div className="flex items-center mx-2">
                  <FontAwesomeIcon
                    icon={faChalkboardTeacher}
                    className="w-5 h-5 ml-2"
                  />
                  <span>أستاذ {teacher?.teaching_subjects}</span>
                </div>
                <div className="flex items-center mx-2 ">
                  <FontAwesomeIcon
                    icon={faUniversity}
                    className="w-5 h-5 ml-2"
                  />
                  <span>
                    {teacher?.degree} - {teacher?.university}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex justify-center items-center">
                <FontAwesomeIcon
                  icon={faUserGroup}
                  className="w-8 h-8 text-blue-700 ml-1"
                />
                <span className="text-gray-700 text-xl font-semibold">
                  {subscriptionsNumber} طالب
                </span>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mt-8 text-center">
              <h2 className="text-2xl font-semibold text-gray-800">نبذة عني</h2>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto leading-relaxed">
                {teacher?.bio ||
                  "أنا أستاذ شغوف بتعليم الطلاب ومساعدتهم على تحقيق أهدافهم الأكاديمية. انضم إليّ لتجربة تعليمية ممتعة ومثمرة!"}
              </p>
            </div>

            {/* Action Buttons */}
            {!isOwner && (
              <div className="mt-8 flex flex-col sm:flex-row justify-center ">
                <button
                  onClick={handleSubscribeClick}
                  className="px-6 py-3 bg-grey-900 text-white rounded-full font-semibold mx-4 my-4 hover:bg-blue-700 transition duration-300 transform hover:scale-105"
                >
                  انضم الآن
                </button>
                <button
                  onClick={() => teacher && handlePrivateSession(teacher.id)}
                  className="px-6 py-3 bg-gray-700 text-white rounded-full  mx-4 my-4 font-semibold hover:bg-gray-800 transition duration-300 transform hover:scale-105"
                >
                  اطلب حصة خاصة
                </button>
              </div>
            )}

            {/* Plans Section */}
            {!isSubscribed && !isOwner && (
              <div ref={targetDivRef} className="mt-12">
                <h2 className="text-2xl font-semibold text-gray-800 text-center">
                  اختر خطتك التعليمية
                </h2>
                <PlanComponent onSelectPlan={handleSelectPlan} />
              </div>
            )}

            {/* Groups Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-semibold text-gray-800 text-center">
                مجموعاتي التعليمية
              </h2>
              <TeacherGroups groups={groups} />
            </div>
          </div>
        </div>

        {/* Popup */}
        {isPopupVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800">
                تهانينا على اشتراكك!
              </h2>
              <p className="mt-4 text-gray-600">
                شكراً لتسجيلك معنا! سيتم التواصل معك قريباً لتأكيد اشتراكك وبدء رحلتك التعليمية.
              </p>
              <button
                onClick={handleClosePopup}
                className="mt-6 w-full px-4 py-2 bg-grey-900 text-white rounded-full hover:bg-blue-700 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Page */}
        {showConfirmation && (
          <ConfirmationPage
            teacherId={params.id}
            planId={selectedPlanId || ""}
            onConfirm={handleConfirm}
            onClose={() => setShowConfirmation(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Profile;
