'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Bell,
  Calendar,
  ClipboardList,
  Menu,
  Presentation,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false); // Mobile sidebar
  const [isExpanded, setIsExpanded] = useState(false); // Large screen expansion
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      // On mobile, we want the sidebar to be expanded when open
      if (mobile && isOpen) {
        setIsExpanded(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isOpen]);

  const dashboardPaths = ['/login', '/register', '/', '/student-form' , '/student-form/4eme',
    '/student-form/terminal','/continuereg', '/verify-email', '/privacy-policy'];
  const isDashboard = dashboardPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    // On mobile, toggle expansion along with opening
    if (isMobile) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      {!isDashboard && (
        <div>
          {/* Mobile Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="sm:hidden fixed bottom-4 right-4 z-50 p-2 text-white bg-orange-600 rounded-full shadow-md hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Sidebar */}
          <div className="flex h-full">
            <aside
              id="default-sidebar"
              className={`fixed top-0 right-0 z-40 h-screen transition-all duration-300 ease-in-out overflow-hidden 
              ${isOpen ? 'translate-x-0' : 'translate-x-full sm:translate-x-0'}
              ${(isMobile && isOpen) || isExpanded ? 'w-64' : 'w-16'}`}
              onMouseEnter={() => !isMobile && setIsExpanded(true)}
              onMouseLeave={() => !isMobile && setIsExpanded(false)}
            >
          <div className="h-full px-3 fixed bg-transparent py-4 overflow-y-auto bg-opacity-60 backdrop-blur-md text-gray-700 shadow-[-0.5px_0px_0.3px_0px_rgba(0,0,0,0.3)]">
                {/* Logo */}
                <div className="flex flex-row justify-center mb-4">
                  <Link href={'/dashboard'}>
                    <img
                      src={`${typeof window !== 'undefined' ? window.location.origin : ''}/logoblack.png`}
                      alt="logo riffaa"
                      className={`${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'} w-24 h-24`}
                    />
                  </Link>
                </div>

                {/* Sidebar Links */}
                <ul className="space-y-2 font-medium">
                  <li className={`transition-colors duration-75 hover:bg-orange-600 hover:text-white rounded-lg ${pathname === '/dashboard' ? 'bg-orange-600 text-white' : ''}`}>
                    <Link
                      href={'/dashboard'}
                      className="flex items-center p-2 text-gray-900 rounded-lg group"
                    >
                      <LayoutDashboard className="flex-shrink-0 w-5 h-5" />
                      <span className={`flex-1 me-3 whitespace-nowrap ${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'}`}>
                        لوحة التحكم
                      </span>
                    </Link>
                  </li>

                  <li className={`transition-colors duration-75 hover:bg-orange-600 hover:text-white rounded-lg ${pathname === '/groups' ? 'bg-orange-600 text-white' : ''}`}>
                    <Link
                      href={'/groups'}
                      className="flex items-center p-2 text-gray-900 rounded-lg group"
                    >
                      <Users className="flex-shrink-0 w-5 h-5" />
                      <span className={`flex-1 me-3 whitespace-nowrap ${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'}`}>
                        المجموعات
                      </span>
                    </Link>
                  </li>

                  <li className={`transition-colors duration-75 hover:bg-orange-600 hover:text-white rounded-lg ${pathname === '/notes' ? 'bg-orange-600 text-white' : ''}`}>
                    <Link
                      href={'/notes'}
                      className="flex items-center p-2 text-gray-900 rounded-lg group"
                    >
                      <FileText className="flex-shrink-0 w-5 h-5" />
                      <span className={`flex-1 me-3 whitespace-nowrap ${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'}`}>
                        الملاحظات
                      </span>
                    </Link>
                  </li>

                  <li className={`transition-colors duration-75 hover:bg-orange-600 hover:text-white rounded-lg ${pathname === '/flashcards' ? 'bg-orange-600 text-white' : ''}`}>
                    <Link
                      href={'/flashcards'}
                      className="flex items-center p-2 text-gray-900 rounded-lg group"
                    >
                      <BookOpen className="flex-shrink-0 w-5 h-5" />
                      <span className={`flex-1 me-3 whitespace-nowrap ${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'}`}>
                        البطاقات التعليمية
                      </span>
                    </Link>
                  </li>

                  <li className={`transition-colors duration-75 hover:bg-orange-600 hover:text-white rounded-lg ${pathname === '/notifications' ? 'bg-orange-600 text-white' : ''}`}>
                    <Link
                      href={'/notifications'}
                      className="flex items-center p-2 text-gray-900 rounded-lg group"
                    >
                      <Bell className="flex-shrink-0 w-5 h-5" />
                      <span className={`flex-1 me-3 whitespace-nowrap ${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'}`}>
                        التنبيهات
                      </span>
                    </Link>
                  </li>

                  <li className={`transition-colors duration-75 hover:bg-orange-600 hover:text-white rounded-lg ${pathname === '/privet-sessions/' ? 'bg-orange-600 text-white' : ''}`}>
                    <Link
                      href={'/privet-sessions/'}
                      className="flex items-center p-2 text-gray-900 rounded-lg group"
                    >
                      <Presentation className="flex-shrink-0 w-5 h-5" />
                      <span className={`flex-1 me-3 whitespace-nowrap ${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'}`}>
                        حصص خاصة
                      </span>
                    </Link>
                  </li>

                  <li className={`transition-colors duration-75 hover:bg-orange-600 hover:text-white rounded-lg ${pathname === '/dashboard/callendar/' ? 'bg-orange-600 text-white' : ''}`}>
                    <Link
                      href={'/dashboard/callendar/'}
                      className="flex items-center p-2 text-gray-900 rounded-lg group"
                    >
                      <Calendar className="flex-shrink-0 w-5 h-5" />
                      <span className={`flex-1 me-3 whitespace-nowrap ${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'}`}>
                        التوقيت
                      </span>
                    </Link>
                  </li>

                  <li className={`transition-colors duration-75 hover:bg-orange-600 hover:text-white rounded-lg ${pathname === '/teachers' ? 'bg-orange-600 text-white' : ''}`}>
                    <Link
                      href={'/teachers'}
                      className="flex items-center p-2 text-gray-900 rounded-lg group"
                    >
                      <ClipboardList className="flex-shrink-0 w-5 h-5" />
                      <span className={`flex-1 me-3 whitespace-nowrap ${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'}`}>
                        المعلمون
                      </span>
                    </Link>
                  </li>

                  <li className={`transition-colors duration-75 hover:bg-orange-600 hover:text-white rounded-lg ${pathname === '/whiteboard' ? 'bg-orange-600 text-white' : ''}`}>
                    <Link
                      href={'/whiteboard'}
                      className="flex items-center p-2 text-gray-900 rounded-lg group"
                    >
                      <Calendar className="flex-shrink-0 w-5 h-5" />
                      <span className={`flex-1 me-3 whitespace-nowrap ${(isMobile && isOpen) || isExpanded ? 'block' : 'hidden'}`}>
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