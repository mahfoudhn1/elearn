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
     <div className='flex flex-raw relative'>
      
      <link
          href="https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap"
          rel="stylesheet"
        />
     <section className={` flex flex-raw md:mr-10 mr-0 space-x-2 md:w-2/3 w-full pt-4`}>
 
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
       
           <Link href={'/teachers?teaching_level=HIGHER'}>
         <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black to-transparent font-semibold w-full text-white flex flex-raw justify-between  h-1/3 opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100 ">
            <h2 className="text-3xl font-bold mb-2 ">تعليم <br /> دورات</h2>
            <h2 className="text-3xl font-bold mb-2 ">100  <br /> أستاذ</h2>
           
 
         </div>
           </Link>
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
           <Link href={'/teachers?teaching_level=MIDDLE'}>
           <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black to-transparent font-semibold w-full text-white flex flex-raw justify-between  h-1/3 opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100 ">

             <h2 className="text-3xl font-bold mb-2">تعليم <br /> متوسط</h2>
             <h2 className="text-3xl font-bold mb-2">100  <br /> أستاذ</h2>
         </div>
          </Link>
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
         <Link href={'/teachers?teaching_level=SECONDARY'}>
         <div className={`absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black to-transparent font-semibold w-full text-white flex flex-raw justify-between  h-1/3  transition-opacity duration-500 ease-in-out  
            ${isHovered ? 'opacity-0 ':'opacity-100'}
           `}>

           <h2 className="text-3xl font-bold ">تعليم <br /> ثانوي</h2>
           <h2 className="text-3xl font-bold ">100  <br /> أستاذ</h2>
         </div>

          </Link>
         </div>          
       </section>
          <section className="hidden lg:flex lg:w-1/3 flex-col -mr-12 items-center justify-center text-center h-full text-gray-dark relative">
            <div className="text-4xl xl:text-6xl font-arabic -mr-10 transition-all duration-300 p-4">
              <p className="font-quran leading-relaxed">
                يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ<br/>
                وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ
              </p>
            </div>
            
          </section>
          <div className="absolute md:bottom-4  -bottom-8 right-1/2 transform translate-x-1/2 drop-shadow-xl overflow-hidden bg-gray-dark">
              <div className="relative group cursor-pointer">
                <Link href="/login">
                  <button className="px-7 py-4 font-semibold text-lg text-white">
                    أبدء التعلم
                  </button>
                  <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-80 transform scale-y-0 group-hover:h-full group-hover:scale-y-100 transition-all duration-300"></span>
                </Link>
              </div>
            </div>

       </div>
    
   

   
  );
};

export default Hero;
