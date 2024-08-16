// components/Navbar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

const Sidebar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(true); // Track sidebar visibility

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div>
            {/* Toggle Button for Mobile */}
            <button 
                onClick={toggleSidebar} 
                className="fixed top-4 left-4 z-50 p-2 bg-blue-500 text-white rounded-md md:hidden"
            >
                {isOpen ? 'Close' : 'Open'} Sidebar
            </button>

            <nav 
                className={`bg-[#fcfcfc] shadow-lg h-screen fixed top-0 right-0 transition-transform transform ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                } min-w-[250px] py-6 px-4 font-[sans-serif] overflow-auto md:relative md:translate-x-0 md:w-[250px]`}
            >
                <a href="javascript:void(0)">
                    <img 
                        src="https://readymadeui.com/readymadeui.svg" 
                        alt="logo" 
                        className='w-[160px]' 
                    />
                </a>

                <ul className="mt-8">
                    <li>
                        <a href="javascript:void(0)"
                           className="text-gray-600 hover:text-black transition-all text-sm flex items-center hover:bg-[#efefef] rounded-md px-4 py-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-[18px] h-[18px] mr-4"
                                 viewBox="0 0 512 512">
                                <path
                                    d="M197.332 170.668h-160C16.746 170.668 0 153.922 0 133.332v-96C0 16.746 16.746 0 37.332 0h160c20.59 0 37.336 16.746 37.336 37.332v96c0 20.59-16.746 37.336-37.336 37.336zM37.332 32A5.336 5.336 0 0 0 32 37.332v96a5.337 5.337 0 0 0 5.332 5.336h160a5.338 5.338 0 0 0 5.336-5.336v-96A5.337 5.337 0 0 0 197.332 32zm160 480h-160C16.746 512 0 495.254 0 474.668v-224c0-20.59 16.746-37.336 37.332-37.336h160c20.59 0 37.336 16.746 37.336 37.336v224c0 20.586-16.746 37.332-37.336 37.332zm-160-266.668A5.337 5.337 0 0 0 32 250.668v224A5.336 5.336 0 0 0 37.332 480h160a5.337 5.337 0 0 0 5.336-5.332v-224a5.338 5.338 0 0 0-5.336-5.336zM474.668 512h-160c-20.59 0-37.336-16.746-37.336-37.332v-96c0-20.59 16.746-37.336 37.336-37.336h160c20.586 0 37.332 16.746 37.332 37.336v96C512 495.254 495.254 512 474.668 512zm-160-138.668a5.338 5.338 0 0 0-5.336 5.336v96a5.337 5.337 0 0 0 5.336 5.332h160a5.336 5.336 0 0 0 5.332-5.332v-96a5.337 5.337 0 0 0-5.332-5.336zm160-74.664h-160c-20.59 0-37.336-16.746-37.336-37.336v-224C277.332 16.746 294.078 0 314.668 0h160C495.254 0 512 16.746 512 37.332v224c0 20.59-16.746 37.336-37.332 37.336zM314.668 32a5.337 5.337 0 0 0-5.336 5.332v224a5.338 5.338 0 0 0 5.336 5.336h160a5.337 5.337 0 0 0 5.332-5.336v-224A5.336 5.336 0 0 0 474.668 32zm0 0"
                                    data-original="#000000" />
                            </svg>
                            <span>Dashboard</span>
                        </a>
                    </li>
                </ul>

                <div className="mt-6">
                    <div className="flex cursor-pointer group">
                        <h6 className="text-gray-600 group-hover:text-black text-sm font-bold px-4 flex-1">Information</h6>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 fill-gray-600 group-hover:fill-black"
                             viewBox="0 0 451.847 451.847">
                            <path
                                d="M225.923 354.706c-8.098 0-16.195-3.092-22.369-9.263L9.27 151.157c-12.359-12.359-12.359-32.397 0-44.751 12.354-12.354 32.388-12.354 44.748 0l171.905 171.915 171.906-171.909c12.359-12.354 32.391-12.354 44.744 0 12.365 12.354 12.365 32.392 0 44.751L248.292 345.449c-6.177 6.172-14.274 9.257-22.369 9.257z"
                                data-original="#000000" />
                        </svg>
                    </div>

                    <ul className="space-y-1 mt-2 pl-4">
                        <li>
                            <a href="javascript:void(0)"
                               className="text-gray-600 hover:text-black transition-all text-sm flex items-center hover:bg-[#efefef] rounded-md px-4 py-3">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-[18px] h-[18px] mr-4"
                                     viewBox="0 0 512 512">
                                    <path
                                        d="M437.02 74.98C388.668 26.63 324.379 0 256 0S123.332 26.629 74.98 74.98C26.63 123.332 0 187.621 0 256s26.629 132.668 74.98 181.02C123.332 485.37 187.621 512 256 512s132.668-26.629 181.02-74.98C485.37 388.668 512 324.379 512 256s-26.629-132.668-74.98-181.02zM111.105 429.297c8.454-72.735 70.989-128.89 144.895-128.89 38.96 0 75.598 15.179 103.156 42.734 23.281 23.285 37.965 53.687 41.742 86.152C361.641 462.172 311.094 482 256 482s-105.637-19.828-144.895-52.703zM256 94.133c57.739 0 106.473 39.8 122.452 93.413-44.002-19.472-93.396-30.099-144.452-30.099-51.119 0-100.494 10.685-144.19 29.919 16.092-52.28 64.052-92.567 122.19-93.413zm0 314.414c-29.533 0-58.73-11.495-80.877-32.491 1.893-29.302 14.305-57.165 35.093-80.259 21.662-23.939 50.614-37.508 81.591-37.508 20.357 0 40.087 7.267 55.793 20.502 5.635 5.237 10.527 11.15 14.228 17.846-42.759 24.051-95.741 38.56-152.452 38.56-16.756 0-33.236-1.577-49.211-4.586 7.533-20.091 23.468-34.865 44.184-39.574 20.845-4.719 41.118-1.927 58.896 8.853 16.107 9.016 29.134 22.942 36.989 39.177 6.618 11.658 11.015 24.406 13.439 37.824-18.874 21.574-47.823 34.521-76.457 34.521z"
                                        data-original="#000000" />
                                </svg>
                                <span>Personal Information</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
