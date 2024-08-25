// components/Navbar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { faClose, faBars, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

const Sidebar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false); // Track sidebar visibility
    const [isExpanded, setIsExpanded] = useState(true);


    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };
    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
      };
    
    return (
       <>
       
       {/* <button
       
        type="button"
        onClick={toggleSidebar}
        className="inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 "
      >
        <span className="sr-only">Open sidebar</span>
        <svg
          className="w-6 h-6"
          aria-hidden="true"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            clipRule="evenodd"
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
          ></path>
        </svg>
      </button> */}
    <div className='flex h-full'>

    
      <aside
        id="default-sidebar"

         className={` transition-transform delay-100 overflow-hidden top-0 right-0 z-40 ${
            isExpanded ? 'w-52' : 'w-16'
          } h-screen `}
        
      >
            <div className="h-full px-3 fixed bg-transparent py-4 overflow-y-auto bg-opacity-60 backdrop-blur-md text-gray-700 shadow-[-0.5px_0px_0.3px_0px_rgba(0,0,0,0.3)] ">
            <div className="flex flex-row justify-between">
            <h1 className={`${isExpanded ? 'block' : 'hidden'}`}>رفعة</h1>
                <button onClick={toggleExpand} className="text-xl cursor-pointer">
                <FontAwesomeIcon icon={isExpanded ? faBars : faBars} />
                </button>
            </div>
                <ul className="space-y-2 font-medium">
                    {/* <p className='text-sm'> main menu </p> */}
                    <li className=''>
                      <Link href={''}>
                        <span className={`flex-1 ms-3 whitespace-nowrap ${
                                          isExpanded ? 'block' : 'hidden'
                                        }`}>لوحة التحكم</span>
                      </Link>
                    </li>
                    <li className='transition-colors duration-75  hover:bg-green hover:text-white'>
                        <Link href={''} className="flex items-center p-2 text-gray-900 rounded-lg group">
                        <div className='shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] p-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white bg-center stroke-0 text-center xl:p-2.5'>
                        <svg className="flex-shrink-0  w-5 h-5 text-gray-500 transition duration-75 " aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
                            <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z"/>
                        </svg>
                        </div>
                        <span className={`flex-1 ms-3 whitespace-nowrap ${
                                        isExpanded ? 'block' : 'hidden'
                                        }`}>المجموعات</span>
                        <span className={`inline-flex items-center justify-center px-2 ms-3 text-sm font-medium text-gray-800 bg-gray-100 rounded-full
                                        ${isExpanded ? 'block' : 'hidden'}`}>
                            Pro</span>
                        </Link>
                    </li>
                    <li className='transition-colors duration-75 hover:bg-green hover:text-white'>
                        <a href="#" className="flex items-center p-2 text-gray-900 rounded-lg  group">
                        <div className='shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] p-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white bg-center stroke-0 text-center xl:p-2.5'>

                        <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 " aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="m17.418 3.623-.018-.008a6.713 6.713 0 0 0-2.4-.569V2h1a1 1 0 1 0 0-2h-2a1 1 0 0 0-1 1v2H9.89A6.977 6.977 0 0 1 12 8v5h-2V8A5 5 0 1 0 0 8v6a1 1 0 0 0 1 1h8v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-4h6a1 1 0 0 0 1-1V8a5 5 0 0 0-2.582-4.377ZM6 12H4a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2Z"/>
                        </svg>
                        </div>
                        <span className={`flex-1 ms-3 whitespace-nowrap ${
                                        isExpanded ? 'block' : 'hidden'
                                        }`}>
                            تنبيهات</span>
                        <span className={`inline-flex items-center justify-center w-3 h-3 p-3 ms-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full
                                            ${isExpanded ? 'block' : 'hidden'}`} >
                                3</span>
                        </a>
                    </li>
                    <li className='transition-colors duration-75 hover:bg-green hover:text-white'>
                        <a href="#" className="flex items-center p-2 text-gray-900 rounded-lg">
                        <div className='shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] p-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white bg-center stroke-0 text-center xl:p-2.5'>

                        <FontAwesomeIcon icon={faCalendarAlt} className='flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75' />
                       </div>
                        <span className={`flex-1 ms-3 whitespace-nowrap ${
                                        isExpanded ? 'block' : 'hidden'
                                        }`}>التوقيت</span>
                        </a>
                    </li>
                    <li className='transition-colors duration-75 hover:bg-green hover:text-white'>
                        <a href="#" className="flex items-center p-2 text-gray-900 rounded-lg">
                        <div className='shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] p-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white bg-center stroke-0 text-center xl:p-2.5'>

                        <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 " aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                            <path d="M14 2a3.963 3.963 0 0 0-1.4.267 6.439 6.439 0 0 1-1.331 6.638A4 4 0 1 0 14 2Zm1 9h-1.264A6.957 6.957 0 0 1 15 15v2a2.97 2.97 0 0 1-.184 1H19a1 1 0 0 0 1-1v-1a5.006 5.006 0 0 0-5-5ZM6.5 9a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 10H5a5.006 5.006 0 0 0-5 5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2a5.006 5.006 0 0 0-5-5Z"/>
                        </svg>
                       </div>
                        <span className={`flex-1 ms-3 whitespace-nowrap ${
                                        isExpanded ? 'block' : 'hidden'
                                        }`}>الطلبة</span>
                        </a>
                    </li>
                    <li className='transition-colors duration-75 hover:bg-green hover:text-gray-light'>
                        <a href="#" className="flex items-center p-2 text-gray-900 rounded-lg">
                        <div className='shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] p-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white bg-center stroke-0 text-center xl:p-2.5'>

                        <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 " aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 20">
                            <path d="M17 5.923A1 1 0 0 0 16 5h-3V4a4 4 0 1 0-8 0v1H2a1 1 0 0 0-1 .923L.086 17.846A2 2 0 0 0 2.08 20h13.84a2 2 0 0 0 1.994-2.153L17 5.923ZM7 9a1 1 0 0 1-2 0V7h2v2Zm0-5a2 2 0 1 1 4 0v1H7V4Zm6 5a1 1 0 1 1-2 0V7h2v2Z"/>
                        </svg>
                          </div>
                        <span className={`flex-1 ms-3 whitespace-nowrap ${
                                        isExpanded ? 'block' : 'hidden'
                                        }`}>الحصص</span>
                        </a>
                    </li>
                    <li className='transition-colors duration-75 hover:bg-green hover:text-white'>
                        <a href="#" className="flex items-center p-2 text-gray-900 rounded-lg">
                        <svg className="flex-shrink-0 w-5 h-5 text-gray-500 transition duration-75 " aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 8h11m0 0L8 4m4 4-4 4m4-11h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"/>
                        </svg>
                        <span className={`flex-1 ms-3 whitespace-nowrap ${
                                        isExpanded ? 'block' : 'hidden'
                                        }`}>تسجيل الخروج</span>
                        </a>
                    </li>
    
                </ul>
                </div>
            </aside>
            </div>
            

       </>
    );
};

export default Sidebar;
