import React from 'react'
import Sidebar from '../components/dahsboardcomponents/sidebar'
import Navbar from '../components/dahsboardcomponents/navbar'
import Cards from '../components/dahsboardcomponents/cards'
import StudentTables from '../components/dahsboardcomponents/tables'
import DayViewCalendar from '../components/dahsboardcomponents/Daycalender'
import Howitworks from '../components/dahsboardcomponents/Howitworks'
import Footer from '../components/homecomponents/Footer'



function Dashboard() {
  return (
    <div className='flex flex-row w-full h-full'>
        <div className='' >
          <Sidebar/>
        </div>
        <div className=' w-full bg-gray-300 flex flex-col'>
            <div className="head relative">
            <Navbar />

            </div>
            <div className="body relative w-full md:p-10 p-2 ">
              <Cards/>
              <Howitworks/>
              <div className='flex md:flex-row flex-col w-full'>
                <div className='md:w-3/4 w-full'>
                <StudentTables/>
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