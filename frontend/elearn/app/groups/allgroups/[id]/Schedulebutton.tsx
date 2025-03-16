"use client"
import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../../../store/store'
import { CalendarCheck } from 'lucide-react'
import Link from 'next/link';

interface SchedulebuttonProps{
    id:number
}

const Schedulebutton=({ id}:SchedulebuttonProps)=> {

 const user = useSelector((state:RootState) => state.auth.user )
    return (
        <div className=''>
        { user?.role === "teacher" &&
            <button className=' bg-gray-dark py-2 px-4 text-white rounded hover:bg-gray-700'>
            <Link href={`/groups/allgroups/${id}/calender/add`}
            className='flex'
            >
            <CalendarCheck className='mx-2'/>
            اضافة و تعديل التوقيت
    
            </Link>
          </button>
        }
        </div>
  )
}

export default Schedulebutton