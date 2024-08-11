import React, { useState } from 'react'

function Mission() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
    const openModal = () => {
      setIsModalOpen(true);
    };
  
    const closeModal = () => {
      setIsModalOpen(false);
    };


    return (
      <div className="flex flex-col md:flex-row rounded-lg bg-gray-light mx-10 p-8 md:p-12">
        {/* Title and Text Section */}
        <div className="md:w-1/2 mb-8 border-l md:mb-0">
          <h1 className="text-4xl font-bold mb-4 text-gray-dark">هدفنا في 
            <span className='text-green'> منبت </span>
          </h1>
          <p className="text-lg text-black">
          نحن ملتزمون بتوفير أفضل الموارد التعليمية لمساعدة الطلبة على تحقيق إمكاناتهم الكاملة. تتمثل مهمتنا في إنشاء منصة تعزز التعلم والنمو والتطوير من خلال حلول مبتكرة وسهلة الوصول.
          </p>
        </div>
        
        {/* Video Section */}
        <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-lg shadow-lg">

              <video
                className="w-full h-auto"
                autoPlay
                muted
                loop
                playsInline
                controls={false} // hides controls
              >
                <source src="/video2.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
              

      </div>
  
  )
}

export default Mission