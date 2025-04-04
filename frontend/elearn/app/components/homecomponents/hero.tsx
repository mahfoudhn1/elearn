import React, { useEffect, useState } from 'react';
import styles from './Hero.module.css'; // Import the CSS module for styling
import Link from 'next/link';

const Hero: React.FC = () => {

  const [isMobile, setIsMobile] = useState(false); // 768px is a common breakpoint for tablets
  

    
    useEffect(() => {
      
  
      const checkIsMobile = () => {
        setIsMobile(window.innerWidth <= 768);
      };
  
      // Initial check
      checkIsMobile();
  
      // Add event listener for window resize
      window.addEventListener('resize', checkIsMobile);
  
      // Clean up the event listener on component unmount
      return () => window.removeEventListener('resize', checkIsMobile);
    }, []);
  

  

  const [isHovered, setisHovered] = useState(false)
  const enterMouse =()=>{setisHovered(true) }
  const leaveMouse =()=>{ setisHovered(false)}

  return (
    <>
    {!isMobile ? 
     <div className='flex flex-raw relative'>
      
      <link
          href="https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap"
          rel="stylesheet"
        />
     <section className={` flex flex-raw mr-10 space-x-2 w-2/3 pt-4`}>
 
     <div onMouseEnter={enterMouse} onMouseLeave={leaveMouse} 
     className={`relative teacherbanner h-[29rem] w-36 mx-2 overflow-hidden rounded-lg shadow-lg transition-all duration-500 ease-in-out group hover:w-96
 
 
     `}>
         <div
           className=" absolute inset-0 bg-cover w-96 bg-center transition-transform duration-500 ease-in-out group-hover:scale-150 "
           style={{ backgroundImage: 'url(/teacher3.jpg)' }}  
         />
       <span className={`absolute bottom-7 left-0 w-36 h-28 bg-gray-dark transition-opacity duration-500 ease-in-out group-hover:opacity-0
 
 
         `}>
       <span className="absolute text-white text-2xl font-semibold text-center rotate-90" > تعليم دورات </span>
       </span>
       
         <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black to-transparent font-semibold w-full text-white flex flex-raw justify-between  h-1/3 opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100 ">
           <h2 className="text-3xl font-bold mb-2 ">تعليم <br /> دورات</h2>
           <h2 className="text-3xl font-bold mb-2 ">100  <br /> أستاذ</h2>
 
         </div>
         </div>
         <div onMouseEnter={enterMouse} onMouseLeave={leaveMouse}
           className={`relative teacherbanner h-[29rem] w-36 mx-2 overflow-hidden rounded-lg shadow-lg transition-all duration-500 ease-in-out group hover:w-96
 
           `}>
         <div
           className="absolute inset-0 bg-cover w-96 bg-center transition-transform duration-500 ease-in-out group-hover:scale-150 group-hover:w-96"
           style={{ backgroundImage: 'url(/middleschool.jpg)' }}  
         />
         <span className={`absolute bottom-7 left-0 w-36 h-28 bg-gray-dark transition-opacity duration-500 ease-in-out group-hover:opacity-0
 
                 `}>  
             <span className="absolute text-white text-2xl font-semibold text-center rotate-90" > التعليم المتوسط </span>
           </span>
           <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black to-transparent font-semibold w-full text-white flex flex-raw justify-between  h-1/3 opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100 ">
             <h2 className="text-3xl font-bold mb-2">تعليم <br /> متوسط</h2>
             <h2 className="text-3xl font-bold mb-2">100  <br /> أستاذ</h2>
         </div>
         </div>
         <div className= {`relative teacherbanner h-[29rem] w-36 overflow-hidden  rounded-lg shadow-lg transition-all duration-500 ease-in-out group 
       ${isHovered ? 'w-36' : 'w-96' }
       `}>
         <div
           className={`absolute inset-0 bg-cover w-96 bg-center transition-transform duration-500 ease-in-out group-hover:scale-150 group-hover:w-96 
             {isHovered ? 'scale-150 ' : 'scale-100', 'w-96':'w-36'}`}
           style={{ backgroundImage: 'url(/highschool.jpg)' }}  
         />
           <span className={`absolute bottom-7 left-0 w-36 h-28 bg-gray-dark transition-opacity duration-500 ease-in-out 
              ${isHovered ? 'opacity-100 ':'opacity-0'}`}>
              <span className="absolute text-white text-2xl font-semibold text-center rotate-90 " > التعليم الثانوي </span>
         </span>
         <div className={`absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black to-transparent font-semibold w-full text-white flex flex-raw justify-between  h-1/3  transition-opacity duration-500 ease-in-out  
            ${isHovered ? 'opacity-0 ':'opacity-100'}
           `}>
           <h2 className="text-3xl font-bold ">تعليم <br /> ثانوي</h2>
           <h2 className="text-3xl font-bold ">100  <br /> أستاذ</h2>
 
         </div>
         </div>
       </section>
       <section className='w-1/3 items-center text-start h-full text-gray-dark cursor-pointer  relative'>
          <div className="mt-20 translate-x-20 text-6xl text-center font-arabic  mx-auto transition-all duration-300">
            <p className="font-quran ">
              يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ <br/><br/>وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ
            </p>
          </div>
        </section>
       <section className='absolute bottom-2 drop-shadow-xl overflow-hidden right-1/2 bg-gray-dark -translate-x-7 '>
       <div className='relative group cursor-pointer'>
        <Link href={'/login'}>
          <button className='px-7 py-10 font-semibold text-lg text-white '>
            أبدء التعلم
          </button>
          <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-80 transform scale-y-0 group-hover:h-40 group-hover:scale-y-100 transition-all duration-300"></span>
        
        </Link>

       </div>
       </section>
       </div>
    :
    
    <div className='flex flex-raw w-full'>
      {/* mobile section  */}
      <section className={` flex flex-col mx-auto items-center justify-center space-y-3 w-full pt-10`}>
 
      <div  
          className={`relative teacherbanner h-44 w-3/4 mx-2 overflow-hidden rounded-lg shadow-lg transition-all duration-500 ease-in-out group 
            `}>
        <div
          className=" absolute inset-0 bg-cover w-full bg-center "
          style={{ backgroundImage: 'url(/teacher3.jpg)'  }}  
        />
        <div className="absolute top-0 left-0 p-6 items-center bg-gradient-to-t from-black to-transparent font-semibold w-full text-white flex flex-raw justify-between  h-full opacity-100 ">
          <h2 className="text-lg font-bold mb-2 ">تعليم <br /> دورات</h2>
          <h2 className="text-lg font-bold mb-2 ">100  <br /> أستاذ</h2>
        </div>
     </div>
     <div  
          className={`relative teacherbanner h-44 w-3/4 mx-2 overflow-hidden rounded-lg shadow-lg transition-all duration-500 ease-in-out group 
            `}>
        <div
          className=" absolute inset-0 bg-cover w-full bg-center "
          style={{ backgroundImage: 'url(/middleschool.jpg)'  }}  
        />
        <div className="absolute top-0 left-0 p-6 items-center bg-gradient-to-t from-black to-transparent font-semibold w-full text-white flex flex-raw justify-between  h-full opacity-100 ">
          <h2 className="text-lg font-bold mb-2 ">متوسط <br /> تعليم</h2>
          <h2 className="text-lg font-bold mb-2 ">100  <br /> أستاذ</h2>
        </div>
     </div>
     <div  
          className={`relative teacherbanner h-44 w-3/4 mx-2 overflow-hidden rounded-lg shadow-lg transition-all duration-500 ease-in-out group 
            `}>
        <div
          className=" absolute inset-0 bg-cover w-full bg-center "
          style={{ backgroundImage: 'url(/highschool.jpg)'  }}  
        />
        <div className="absolute top-0 left-0 p-6 items-center bg-gradient-to-t from-black to-transparent font-semibold w-full text-white flex flex-raw justify-between  h-full opacity-100 ">
          <h2 className="text-lg font-bold mb-2 ">ثانوي <br /> تعليم</h2>
          <h2 className="text-lg font-bold mb-2 ">100  <br /> أستاذ</h2>
        </div>
     </div>


   </section>
        
    </div>

    }
   
      </>
  );
};

export default Hero;
