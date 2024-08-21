import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoneyBill1Wave, faPeopleGroup, faClock } from '@fortawesome/free-solid-svg-icons'

function Cards() {
  return (
<div className="flex flex-wrap mx-3">

    {/* card1 */}
  
  <div className="w-full max-w-full px-3 mb-6 sm:w-1/3 sm:flex-none xl:mb-0 xl:w-1/4">
    <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
      <div className="flex-auto p-4">
        <div className="flex flex-row -mx-3">
        <div className="flex-none w-2/3 max-w-full px-3">
          <div>
            <p className="mb-0 font-sans font-semibold leading-normal text-sm">الدخل الشهري</p>
            <h5 className="mb-0 font-bold">
            دج30000
            <span className="leading-normal text-sm font-weight-bolder mx-2 text-lime-500">+55%</span>
            </h5>
          </div>
        </div>
        <div className="px-3 text-right basis-1/3">
        <div className="inline-block w-12 h-12 text-center rounded-lg bg-gradient-to-tl from-purple to-gray-dark">
        <i className="ni leading-none ni-money-coins text-lg relative top-3.5 text-white">
          <FontAwesomeIcon icon={faMoneyBill1Wave} />
        </i>
        </div>
        </div>
        </div>
      </div>
    </div>
  </div>    
  
  {/* card2 */}

    
  <div className="w-full max-w-full px-3 mb-6 sm:w-1/3 sm:flex-none xl:mb-0 xl:w-1/4">
    <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
      <div className="flex-auto p-4">
        <div className="flex flex-row -mx-3">
        <div className="flex-none w-2/3 max-w-full px-3">
          <div>
            <p className="mb-0 font-sans font-semibold leading-normal text-sm">عدد التلاميذ </p>
            <h5 className="mb-0 font-bold">
            50
            <span className="leading-normal text-sm font-weight-bolder mx-2 text-orange"> +10%</span>
            </h5>
          </div>
        </div>
        <div className="px-3 text-right basis-1/3">
        <div className="inline-block w-12 h-12 text-center rounded-lg bg-gradient-to-tl from-purple to-gray-dark">
        <i className="ni leading-none ni-money-coins text-lg relative top-3.5 text-white">
          <FontAwesomeIcon icon={faPeopleGroup} />
        </i>
        </div>
        </div>
        </div>
      </div>
    </div>
  </div>   
  {/* card3 */}
  
  <div className="w-full max-w-full px-3 mb-6 sm:w-1/3 sm:flex-none xl:mb-0 xl:w-1/4">
    <div className="relative flex flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
      <div className="flex-auto p-4">
        <div className="flex flex-row -mx-3">
        <div className="flex-none w-2/3 max-w-full px-3">
          <div>
            <p className="mb-0 font-sans font-semibold leading-normal text-sm">ساعات التدريس هذا الشهر</p>
            <h5 className="mb-0 font-bold">
            8 ساعات
            <span className="leading-normal text-sm font-weight-bolder mx-2 text-lime-500">+ ساعة</span>
            </h5>
          </div>
        </div>
        <div className="px-3 text-right basis-1/3">
        <div className="inline-block w-12 h-12 text-center rounded-lg bg-gradient-to-tl from-purple to-gray-dark">
        <i className="ni leading-none ni-money-coins text-lg relative top-3.5 text-white">
          <FontAwesomeIcon icon={faClock} />
        </i>
        </div>
        </div>
        </div>
      </div>
    </div>
  </div>   
</div>
    
  )
}

export default Cards