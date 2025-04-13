import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

function TeacherCards() {
  return (
    <div className='flex md:flex-row flex-col gap-6'>
      {/* Platform System Card */}
      <div className="w-full lg:mb-0 md:w-1/2 md:mx-auto">
        <div className="relative flex flex-col min-w-0 break-words bg-white p-6 shadow-soft-xl rounded-2xl bg-clip-border hover:shadow-md transition-shadow">
          <div className="flex flex-wrap mx-3">
            <div className="w-full px-3 lg:w-1/2">
              <div className="flex flex-col h-full">
                <p className="pt-2 mb-1 font-semibold text-gray-800">نظام المنصة</p>
                <h5 className="font-bold mb-4 text-gray-700">منصة رفعة التعليمية</h5>
                <p className="mb-6 text-gray-600">
                  نظام متكامل للتدريس عن بعد مع أدوات بث مباشر، إدارة الطلاب، وتحصيل المدفوعات عبر اشتراكات شهرية أو فصلية.
                </p>
                <div className="mt-auto">
                  <Link href="/workwithus/teacher" className="font-semibold leading-normal text-sm group text-indigo-600 hover:text-indigo-800">
                    تفاصيل النظام
                    <FontAwesomeIcon 
                      icon={faArrowLeft} 
                      className="ml-2 group-hover:-translate-x-1 transition-all duration-200" 
                    />
                  </Link>
                </div>
              </div>
            </div>
            <div className="hidden md:flex w-full lg:w-5/12 mt-6 lg:mt-0">
                <div className="flex items-center justify-center h-full">
                  <img 
                    className="w-1/3 opacity-90" 
                    src="/logoblack.png" 
                    alt="Platform Diagram"
                  />
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Work With Us Card */}
      <div className="w-full lg:w-5/12">
  <div className="relative h-full min-w-0 break-words bg-white shadow-soft-xl rounded-2xl bg-clip-border overflow-hidden">

      <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-tl from-gray-dark to-gray-700 opacity-80"></span>
      <div className="relative z-10 flex flex-col h-full p-6 text-white">
        <p className="pt-2 mb-1 font-semibold">متطلبات التدريس</p>
        <h5 className="font-bold mb-4">كيف تبدأ مع رفعة؟</h5>
        <ul className="mb-6 space-y-2 text-sm">
          <li className="flex items-start">
            <span className="ml-2">•</span>
            <span>اتصال إنترنت مستقر (10 ميجابت/ثانية كحد أدنى)</span>
          </li>
          <li className="flex items-start">
            <span className="ml-2">•</span>
            <span>جهاز حاسوب مع كاميرا أو هاتف ذكي</span>
          </li>
          <li className="flex items-start">
            <span className="ml-2">•</span>
            <span>إمكانية مشاركة الشاشة لعرض العروض التقديمية</span>
          </li>
          <li className="flex items-start">
            <span className="ml-2">•</span>
            <span>لوحة كتابة إلكترونية (اختياري - للشرح التفاعلي)</span>
          </li>
        </ul>
        <div className="mt-auto">
          <Link 
            href="/requirements/teacher" 
            className="font-semibold leading-normal text-sm group text-amber-300 hover:text-white"
          >
            اكتشف التفاصيل الكاملة
            <FontAwesomeIcon 
              icon={faArrowLeft} 
              className="ml-2 group-hover:-translate-x-1 transition-all duration-200" 
            />
          </Link>
        </div>
      </div>
    </div>
  </div>
    </div>
  );
}

export default TeacherCards;