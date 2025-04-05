'use client'

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChalkboardTeacher, faLightbulb, faClock } from '@fortawesome/free-solid-svg-icons';

function Whyus() {
  return (
    <section className="bg-white py-16 px-4 text-center ">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-black mb-4">ميزات منصتنا</h2>
      <p className="text-lg text-gray-dark mb-12">لماذا رفعة هي خيارك الامثل</p>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-8">
        <div className="flex-1 min-w-[300px]  bg-white rounded-lg p-6 shadow-md rtl:text-right">
          <div className="text-4xl text-green mb-4 ">
            <FontAwesomeIcon icon={faChalkboardTeacher} />
          </div>
          <h3 className="text-2xl font-semibold text-black mb-3 rtl:text-right">أفضل المدرسين </h3>
          <p className="text-gray-dark rtl:text-right">
          يتم اختيار افضل المدرسين بناءا على الكفاءة الخبرة و الجودة لضمان جو دراسي مميز.
          </p>
        </div>
        <div className="flex-1 min-w-[300px] bg-white rounded-lg p-6 shadow-md rtl:text-right">
          <div className="text-4xl text-green mb-4">
            <FontAwesomeIcon icon={faLightbulb} />
          </div>
          <h3 className="text-2xl font-semibold text-black mb-3">تعليم تفاعلي</h3>
          <p className="text-gray-dark">
          البث المباشر مع المدرسين و التفاعل معهم من خلال ادوات و تقنيات تعزز الفهم
          .
          </p>
        </div>
        <div className="flex-1 min-w-[300px] bg-white rounded-lg p-6 shadow-md rtl:text-right">
          <div className="text-4xl text-green mb-4">
            <FontAwesomeIcon icon={faClock} />
          </div>
          <h3 className="text-2xl font-semibold text-black mb-3">وصول مرن للحصص</h3>
          <p className="text-gray-dark">
          تعلم دون حدود في اي وقت ومن اي مكان وفق جدولك الخاص
          </p>
        </div>
      </div>
    </div>
  </section>
  )
}

export default Whyus