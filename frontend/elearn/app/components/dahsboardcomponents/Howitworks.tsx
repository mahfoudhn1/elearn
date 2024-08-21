import React from 'react'

function Howitworks() {
  return (
    <div className='flex flex-row mb-6'>
    <div className="w-full  lg:mb-0 lg:w-7/12 lg:flex-none">
   <div className="relative flex  flex-col min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border">
      <div className="flex-auto p-4">
         <div className="flex flex-wrap -mx-3">
            <div className="max-w-full px-3 lg:w-1/2 lg:flex-none">
               <div className="flex flex-col h-full">
                  <p className="pt-2 mb-1 font-semibold text-gray-800">نظام المنصة</p>
                  <h5 className="font-bold text-gray-700">منصة رفعة التعليمية</h5>
                  <p className="mb-12 text-gray">لدى منصة رفعة  برمجة و بث دروس مباشرة لمساعدة التلاميذ عبر اشتراكات شهرية او فصلية يتم دفعها للأساتذة.</p>
                  <a className="mt-auto mb-0 font-semibold leading-normal text-sm group text-gray" href="javascript:;">
                  اقرء المزيد
                  <i className="fas fa-arrow-right ease-bounce text-sm group-hover:translate-x-1.25 ml-1 leading-normal transition-all duration-200"></i>
                  </a>
               </div>
            </div>
            <div className="max-w-full px-3 mt-12 ml-auto text-center lg:mt-0 lg:w-5/12 lg:flex-none">
               <div className="h-full bg-gradient-to-tl from-purple to-gray-dark rounded-xl">
                  <div className="relative flex items-center justify-center h-full">
                     <img className="relative z-20 w-1/2  pt-6" src="/logowhite.png" alt="rocket"/>
                  </div>
               </div>
            </div>
         </div>
      </div>
   </div>
</div>
<div className="w-full max-w-full px-3 lg:w-5/12 lg:flex-none">
   <div className="border-black/12.5 shadow-soft-xl relative flex h-full min-w-0 flex-col break-words rounded-2xl border-0 border-solid bg-white bg-clip-border p-4">
      <div className="relative h-full overflow-hidden bg-cover rounded-xl" style={{ backgroundImage: 'url(/teacher.jpg)' }}>
         <span className="absolute top-0 left-0 w-full h-full bg-center bg-cover bg-gradient-to-tl from-gray-800 to-gray-dark opacity-80"></span>
         <div className="relative z-10 flex flex-col flex-auto h-full p-4">
            <h5 className="pt-2 mb-6 font-bold text-white">العمل مع رفعة</h5>
            <p className="text-white"> رفعة تهدف لتطوير التعليم و تقريب المسافات بين الاساتذة و الطلبة , يمكنك التدريس عبر منصتنا عبر جهاز الحاسوب مع كاميرة او طابلة كتابة توفرها المنصة .</p>
            <a className="mt-auto mb-0 font-semibold leading-normal text-white group text-sm" href="javascript:;">
            اعرف المزيد
            <i className="fas fa-arrow-right ease-bounce text-sm group-hover:translate-x-1.25 ml-1 leading-normal transition-all duration-200"></i>
            </a>
         </div>
      </div>
   </div>
</div>
    </div>
  )
}

export default Howitworks