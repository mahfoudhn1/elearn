// components/Navbar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Bell,
  Calendar,
  ClipboardList,
  LogOut,
  User,
  Menu,
  Presentation,
} from 'lucide-react';
import { usePathname } from 'next/navigation';


const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false); // Track sidebar visibility on mobile
  const [isExpanded, setIsExpanded] = useState(false); // Track sidebar expansion
  const pathname = usePathname(); 
  
  const dashboardPaths = ['/login', '/register','/', '/continuereg','/verify-email', '/privacy-policy'];
  const isDashboard = dashboardPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
  
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
    {!isDashboard && (
    <div>
      {/* Mobile Toggle Button */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="sm:hidden fixed bottom-4 right-4 z-50 p-2 text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <div className="flex h-full">
        <aside
          id="default-sidebar"
          className={`fixed top-0 right-0 z-40 h-screen transition-all delay-100 overflow-hidden ${
            isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-0'
          } ${isExpanded ? 'w-64' : 'w-16'}`}
        >
          <div className="h-full px-3 fixed bg-transparent py-4 overflow-y-auto bg-opacity-60 backdrop-blur-md text-gray-700 shadow-[-0.5px_0px_0.3px_0px_rgba(0,0,0,0.3)]">
            {/* Sidebar Expansion Button */}
            <div className="flex flex-row justify-between">
              <Link href={'/dashboard'} >
                <img src={`${window.location.origin}/logoblack.png`}  alt="logo riffaa" className={`${isExpanded ? 'block' : 'hidden'} w-14 h-24 ml-8 -translate-x-10 `}/>
              
              </Link>

              <button
                onClick={toggleExpand}
                className="text-xl cursor-pointer p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Sidebar Links */}
            <ul className="space-y-2 font-medium">
              {/* Dashboard */}
              <li className="transition-colors duration-75 hover:bg-green hover:text-white">
                <Link
                  href={'/dashboard'}
                  className="flex items-center p-2 text-gray-900 rounded-lg group"
                >
                  <LayoutDashboard className="flex-shrink-0 w-5 h-5 text-gray-700 transition duration-75" />
                  <span className={`flex-1 me-3 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>
                    لوحة التحكم
                  </span>
                </Link>
              </li>

              {/* Groups */}
              <li className="transition-colors duration-75 hover:bg-green hover:text-white">
                <Link
                  href={'/groups'}
                  className="flex items-center p-2 text-gray-900 rounded-lg group"
                >
                  <Users className="flex-shrink-0 w-5 h-5 text-gray-700 transition duration-75" />
                  <span className={`flex-1 me-3 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>
                    المجموعات
                  </span>
                </Link>
              </li>

              {/* Notes */}
              <li className="transition-colors duration-75 hover:bg-green hover:text-white">
                <Link
                  href={'/notes'}
                  className="flex items-center p-2 text-gray-900 rounded-lg group"
                >
                  <FileText className="flex-shrink-0 w-5 h-5 text-gray-700 transition duration-75" />
                  <span className={`flex-1 me-3 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>
                    الملاحظات
                  </span>
                </Link>
              </li>

              {/* Flashcards */}
              <li className="transition-colors duration-75 hover:bg-green hover:text-white">
                <Link
                  href={'/flashcards'}
                  className="flex items-center p-2 text-gray-900 rounded-lg group"
                >
                  <BookOpen className="flex-shrink-0 w-5 h-5 text-gray-700 transition duration-75" />
                  <span className={`flex-1 me-3 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>
                    البطاقات التعليمية
                  </span>
                </Link>
              </li>

              {/* Notifications */}
              <li className="transition-colors duration-75 hover:bg-green hover:text-white">
                <Link
                  href={'/notifications'}
                  className="flex items-center p-2 text-gray-900 rounded-lg group"
                >
                  <Bell className="flex-shrink-0 w-5 h-5 text-gray-700 transition duration-75" />
                  <span className={`flex-1 me-3 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>
                    التنبيهات
                  </span>
                </Link>
              </li>
              {/* private session */}
              <li className="transition-colors duration-75 hover:bg-green hover:text-white">
                  <Link
                  href={'/privet-sessions/'}
                  className="flex items-center p-2 text-gray-900 rounded-lg group"
                >
                  <Presentation className="flex-shrink-0 w-5 h-5 text-gray-700 transition duration-75" />
                  <span className={`flex-1 me-3 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>
                    حصص خاصة
                  </span>
                </Link>
              </li>
              {/* callender  */}
              <li className="transition-colors duration-75 hover:bg-green hover:text-white">
                  <Link
                  href={'/dashboard/callendar/'}
                  className="flex items-center p-2 text-gray-900 rounded-lg group"
                >
                  <Calendar className="flex-shrink-0 w-5 h-5 text-gray-700 transition duration-75" />
                  <span className={`flex-1 me-3 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>
                    التوقيت
                  </span>
                </Link>
              </li>
              {/* Teachers */}
              <li className="transition-colors duration-75 hover:bg-green hover:text-white">
                <Link
                  href={'/teachers'}
                  className="flex items-center p-2 text-gray-900 rounded-lg group"
                >
                  <ClipboardList className="flex-shrink-0 w-5 h-5 text-gray-700 transition duration-75" />
                  <span className={`flex-1 me-3 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>
                    المعلمون
                  </span>
                </Link>
              </li>

              {/* Whiteboard */}
              <li className="transition-colors duration-75 hover:bg-green hover:text-white">
                <Link
                  href={'/whiteboard'}
                  className="flex items-center p-2 text-gray-900 rounded-lg group"
                >
                  <Calendar className="flex-shrink-0 w-5 h-5 text-gray-700 transition duration-75" />
                  <span className={`flex-1 me-3 whitespace-nowrap ${isExpanded ? 'block' : 'hidden'}`}>
                    السبورة البيضاء
                  </span>
                </Link>
              </li>

        
            </ul>
          </div>
        </aside>
      </div>
    </div>
    )}
    </>
  );
};

export default Sidebar;