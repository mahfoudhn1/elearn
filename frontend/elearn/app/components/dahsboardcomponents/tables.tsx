import React from 'react'

function StudentTables() {
  return (
    <div>
        <div className="w-full  mx-auto">
   <div className="flex flex-wrap mx-3">
      <div className="flex-none w-full max-w-full px-3">
         <div className="relative flex flex-col min-w-0 px-4 py-2 mb-6 break-words bg-white border-0 border-transparent border-solid shadow-soft-xl rounded-2xl bg-clip-border">
            <div className="p-6 pb-0 mb-4 bg-white  rounded-t-2xl flex flex-row justify-between border-gray-transparent">
               <h6 className='text-gray-800 font-semibold'>قائمة التلاميذ المسجلين</h6>
               <input type="text" placeholder='ابحث بالاسم...' className='text-xs text-gray border rounded-lg focus:outline-none px-2 py-1' />
            </div>
            <div className="flex-auto px-0 pt-0 pb-2">
               <div className="p-0 overflow-x-auto">
                  <table className="items-center w-full mb-0 align-top border-gray-200 text-slate-500">
                     <thead className="align-bottom">
                        <tr>
                           <th className="px-6 py-3 font-bold text-right uppercase align-middle bg-transparent border-gray border-gray-200 shadow-none text-xs border-b border-gray-solid tracking-none whitespace-nowrap  text-gray opacity-70">الاسم الكامل</th>
                           <th className="px-6 py-3 pl-2 font-bold text-right uppercase align-middle bg-transparent border-gray border-gray-200 shadow-none text-xs border-b border-gray-solid tracking-none whitespace-nowrap text-gray opacity-70">التخصص</th>
                           <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-gray border-gray-200 shadow-none text-xs border-b border-gray-solid tracking-none whitespace-nowrap text-gray opacity-70">الاشتراك</th>
                           <th className="px-6 py-3 font-bold text-center uppercase align-middle bg-transparent border-gray border-gray-200 shadow-none text-xs border-b border-gray-solid tracking-none whitespace-nowrap text-gray opacity-70">تاريخ التسجيل</th>
                           <th className="px-6 py-3 font-semibold capitalize align-middle bg-transparent border-b border-gray border-gray-200 border-solid shadow-none tracking-none whitespace-nowrap text-gray opacity-70"></th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr>
                           <td className="p-2 align-middle bg-transparent border-b border-gray  whitespace-nowrap shadow-transparent">
                              <div className="flex px-2 py-1">
                                 <div>
                                    <img src="https://i.pinimg.com/564x/0c/86/63/0c86631c838aa7c39cbf1fae11ec159a.jpg" className="inline-flex items-center justify-center ml-4 text-sm text-white transition-all duration-200 ease-soft-in-out h-9 w-9 rounded-xl" alt="user1"/>
                                 </div>
                                 <div className="flex flex-col justify-center">
                                    <h6 className="mb-0 text-sm leading-normal text-gray-800">ماريا بوتوتوا</h6>
                                    <p className="mb-0 text-xs leading-tight text-gray">السنة الثاثلة ثانوي</p>
                                 </div>
                              </div>
                           </td>
                           <td className="p-2 align-middle bg-transparent border-b border-gray whitespace-nowrap shadow-transparent">
                              <p className="mb-0 text-xs font-semibold leading-tight text-gray-800 ">رياضيات</p>
                           </td>
                           <td className="p-2 text-sm leading-normal text-center align-middle bg-transparent border-b border-gray whitespace-nowrap shadow-transparent">
                              <span className="bg-gradient-to-tl from-green to-lime-500 px-2 text-xs rounded-md py-1 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">جارية</span>
                           </td>
                           <td className="p-2 text-center align-middle bg-transparent border-b border-gray whitespace-nowrap shadow-transparent">
                              <span className="text-xs font-semibold leading-tight text-gray">21/08/2024</span>
                           </td>
                           <td className="p-2 align-middle bg-transparent border-b border-gray whitespace-nowrap shadow-transparent">
                              <a href=";" className="text-xs font-semibold leading-tight text-gray"> Edit </a>
                              <a href=";" className="text-xs font-semibold leading-tight text-gray"> View </a>
                              <a href=";" className="text-xs font-semibold leading-tight text-gray"> Delete </a>
                           
                           </td>
                        </tr>
                        <tr>
                           <td className="p-2 align-middle bg-transparent border-b border-gray  whitespace-nowrap shadow-transparent">
                              <div className="flex px-2 py-1">
                                 <div>
                                    <img src="https://i.pinimg.com/564x/d2/ca/3c/d2ca3cf6d0769f2d550a50664c100617.jpg" className="inline-flex items-center justify-center ml-4 text-sm text-white transition-all duration-200 ease-soft-in-out h-9 w-9 rounded-xl" alt="user1"/>
                                 </div>
                                 <div className="flex flex-col justify-center">
                                    <h6 className="mb-0 text-sm leading-normal">محمد أحمد</h6>
                                    <p className="mb-0 text-xs leading-tight text-gray">السنة الثاثلة ثانوي</p>
                                 </div>
                              </div>
                           </td>
                           <td className="p-2 align-middle bg-transparent border-b border-gray whitespace-nowrap shadow-transparent">
                              <p className="mb-0 text-xs font-semibold leading-tight">رياضيات</p>
                           </td>
                           <td className="p-2 text-sm leading-normal text-center align-middle bg-transparent border-b border-gray whitespace-nowrap shadow-transparent">
                              <span className="bg-gradient-to-tl from-gray-light to-gray px-2 text-xs rounded-md py-1 inline-block whitespace-nowrap text-center align-baseline font-bold uppercase leading-none text-white">متوقفة</span>
                           </td>
                           <td className="p-2 text-center align-middle bg-transparent border-b border-gray whitespace-nowrap shadow-transparent">
                              <span className="text-xs font-semibold leading-tight text-gray">21/08/2024</span>
                           </td>
                           <td className="p-2 align-middle bg-transparent border-b border-gray whitespace-nowrap shadow-transparent">
                              <a href=";" className="text-xs font-semibold leading-tight text-gray"> Edit </a>
                              <a href=";" className="text-xs font-semibold leading-tight text-gray"> View </a>
                              <a href=";" className="text-xs font-semibold leading-tight text-gray"> Delete </a>
                           
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      </div>
   </div>
  
</div>
    </div>
  )
}

export default StudentTables