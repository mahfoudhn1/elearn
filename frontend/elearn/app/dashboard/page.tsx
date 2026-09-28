"use client"
import React, { useEffect, useState } from 'react'
import Cards from './components/cards'
import TeachersTable from './components/tables'
import dynamic from 'next/dynamic'
import axiosClientInstance from '../lib/axiosInstance'
import { payement, Subscription } from '../types/student'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import StudentTable from './components/studentTable'
import { fetchTeacherPayments } from '../api/fetchpayement'
import { fetchStudentSubscriptions, fetchTeacherSubscriptions } from '../api/fetchSubscriptions'
import TeacherCards from './components/Howitworks'
import StudentCards from './components/HowitworksStudent'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLanguage, faRobot } from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'next/navigation'
import GroupsPage from '../groups/allgroups/page'
import StudentGroupsSlider from './components/studentsGroup'
import TeacherGroupsSlider from './components/teachersGroups'

const DayViewCalendar = dynamic(() => import('./components/Daycalender'), { ssr: false });

function Dashboard() {
  const [subcriptions, setSubcriptions] = useState<Subscription[]>([])
  const [studentSubcriptions, setStudentSubcriptions] = useState<Subscription[]>([])
  const [payment, setPayment]= useState()
  const [error, setError] = useState('')
  const user = useSelector((state:RootState) => state.auth.user)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const paymentData = await fetchTeacherPayments();
        setPayment(paymentData);

        if (user?.role === "teacher") {
          const teacherSubs = await fetchTeacherSubscriptions();
          setSubcriptions(teacherSubs);
        } else {
          const studentSubs = await fetchStudentSubscriptions();
          setStudentSubcriptions(studentSubs);
        }
      } catch (err: any) {
        setError(err.message);
        console.error("Error in fetch:", err);
      }
    };

    loadData();
  }, [user]);

  return (
    <div className='flex flex-row w-full h-full'>
      <div className='relative'></div>

      <div className='w-full bg-gray-300 flex flex-col'>
        <div className="head relative"></div>

        <div className="body relative w-full md:p-10 p-2">

          {payment && subcriptions && <Cards payment={payment} subscriptionCount={subcriptions.length} />}

          {/* 👇 Language Learning Card only for Students */}
          {user?.role === 'student' && (
          <div className="flex flex-row items-center w-full mb-6 gap-8">
            <div
              className="w-full md:w-[60%] cursor-pointer"
              onClick={() => router.push('/riffaAi')}
            >
              <div className="relative flex flex-col justify-between h-full p-6 bg-grey-900 shadow-lg rounded-2xl hover:shadow-xl transition-transform hover:scale-[1.02]">
                
                <div>
                  <div className="inline-flex items-center justify-center w-14 h-14 mb-5 rounded-full bg-gray-800">
                    <FontAwesomeIcon icon={faRobot} className="text-orange-500 text-2xl" />
                  </div>

                  <h3 className="text-xl font-bold mb-2 text-white">نقدم لكم مساعد رفعة الذكي</h3>
                  <p className="text-base text-gray-400 mb-4">
                    تجربة تعلم جديدة مع مساعد الذكاء الاصطناعي لمساعدتك في رحلتك التعليمية.
                  </p>
                </div>

                <div className="mt-5">
                  <span className="inline-block border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-semibold px-5 py-2 rounded-full text-base transition">
                    اكتشف المزيد
                  </span>
                </div>
              </div>
            </div>
            <div
              className="w-full md:w-1/3 cursor-pointer"
              onClick={() => router.push('/languages')}
            >
              <div className="relative flex flex-col justify-between h-full p-5 bg-white shadow-md rounded-2xl hover:shadow-lg transition-transform hover:scale-[1.02]">
                
                <div>
                  <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-blue-100">
                    <FontAwesomeIcon icon={faLanguage} className="text-orange-600 text-xl" />
                  </div>

                  <h3 className="text-lg font-bold mb-1 text-orange-600">هل ترغب في تعلم لغة جديدة؟</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    منصة رفعة تقدم دروسًا مخصصة في الإنجليزية، الفرنسية، الإسبانية وغير ذلك!
                  </p>
                  <div className="text-xl mt-1">
                    🇬🇧 🇫🇷 🇪🇸  🇩🇪
                  </div>
                </div>

                <div className="mt-4">
                  <span className="inline-block border border-orange text-orange hover:bg-grey-900 hover:border-grey-900 hover:text-white font-semibold px-4 py-1 rounded-full text-sm transition">
                    ابدأ التعلم الآن
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}


          {user?.role == 'teacher' ? <TeacherCards /> : <StudentCards />}
          <div className='mt-4'>
          {user?.role == 'teacher' ? <TeacherGroupsSlider/> : <StudentGroupsSlider />}
          
        </div>
          <div className='flex md:flex-row flex-col w-full'>
            <div className='md:w-3/4 w-full'>
              {user?.role == "teacher" ?
                <TeachersTable subscriptions={subcriptions} />
                :
                <StudentTable studentSubcriptions={studentSubcriptions} />
              }
            </div>
            <div className='md:w-1/4 w-full'>
              <DayViewCalendar />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard
