import React from 'react'
import Sidebar from '../components/dahsboardcomponents/sidebar'
import Navbar from '../components/dahsboardcomponents/navbar'
import Cards from '../components/dahsboardcomponents/cards'
import StudentTables from '../components/dahsboardcomponents/tables'
import DayViewCalendar from '../components/dahsboardcomponents/Daycalender'
import Howitworks from '../components/dahsboardcomponents/Howitworks'



function Dashboard() {
  return (
    <div className='flex flex-row w-full h-full'>
        <div >
          <Sidebar/>
        </div>
        <div className=' w-full bg-gray-300 flex flex-col'>
            <div className="head relative">
            <Navbar />

            </div>
            <div className="body p-10">
              <Cards/>
              <Howitworks/>
              <div className='flex flex-row w-full'>
                <div className=''>
                <StudentTables/>
                </div>
              <div className='w-1/4'>
              <DayViewCalendar/>

              </div>
              </div>
            </div>
        </div>
    </div>
  )
}

export default Dashboard