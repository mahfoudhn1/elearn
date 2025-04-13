"use client"
import React, { useEffect, useState } from 'react'

import Cards from './components/cards'
import TeachersTable from './components/tables'
const DayViewCalendar = dynamic(() => import('./components/Daycalender'), {
  ssr: false,
});
import axiosClientInstance from '../lib/axiosInstance'
import { payement, Subscription } from '../types/student'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import StudentTable from './components/studentTable'
import { fetchTeacherPayments } from '../api/fetchpayement'
import { fetchStudentSubscriptions, fetchTeacherSubscriptions } from '../api/fetchSubscriptions'
import dynamic from 'next/dynamic'
import TeacherCards from './components/Howitworks';
import StudentCards from './components/HowitworksStudent';



function Dashboard() {
  const [subcriptions, setSubcriptions] = useState<Subscription[]>([])
  const [studentSubcriptions, setStudentSubcriptions] = useState<Subscription[]>([])
  const [payment, setPayment]= useState()
  const [error, setError] = useState('')
  const user = useSelector((state:RootState) => state.auth.user)
  


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
        } catch (err:any) {
          setError(err.message);
          console.error("Error in fetch:", err);
        }
      };
  
      loadData();
    }, [user]); // Depend on user to re-fetch if it changes
    
  return (
    <div className='flex flex-row w-full h-full'>
        <div className='relative' >
        </div>
        <div className=' w-full bg-gray-300 flex flex-col'>
            <div className="head relative">

            </div>
            <div className="body relative w-full md:p-10 p-2 ">
            {payment && subcriptions && <Cards payment={payment} subscriptionCount={subcriptions.length}/>}
            {user?.role == 'teacher'? <TeacherCards/> : <StudentCards/> }
            <div className='flex md:flex-row flex-col w-full'>
                <div className='md:w-3/4 w-full'>
                {user?.role == "teacher"?
                  <TeachersTable subscriptions={subcriptions}/>
                  :
                  <StudentTable studentSubcriptions={studentSubcriptions} />
              }
                </div>
              <div className='md:w-1/4 w-full'>
              <DayViewCalendar/>

              </div>
              </div>
            </div>
            {/* <Footer/> */}
        </div>

    </div>
  )
}

export default Dashboard