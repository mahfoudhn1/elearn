"use client"
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { logout } from '../../../store/authSlice';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }
  const [isOpen, setIsOpen] = useState(false);

  const dispatch = useDispatch<AppDispatch>()

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  const router = useRouter()

  const pathname = usePathname(); 
  
  const dashboardPaths = ['/login', '/register','/', '/continuereg', '/verify-email', '/privacy-policy'];
  const isDashboard = dashboardPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
  
  const isHomePage = pathname === '/' 
  
  // Close dropdown when route changes
  useEffect(() => {
    setIsOpen(false);
    setIsMenuOpen(false);
  }, [pathname]);
  const handleClick = () => {
    router.push('/login'); 
    setIsMenuOpen(false)
  };
  
  const authState = useSelector((state:RootState)=> state.auth.isAuthenticated)
  const user = useSelector((state:RootState)=> state.auth.user)

  const handlelogout =()=>{
    dispatch(logout())
  }
  return (
    <>
    {isDashboard ?
    <header className={`header flex justify-between items-center py-4 bg-transparent px-4 md:px-20 w-full text-black ${!isHomePage? "shadow-sm sticky" : "shadow-none" }`}>
      {/* Logo - hidden on mobile */}
      <div className='hidden md:block relative group w-1/4'>
        <div className="text-3xl w-2/3 text-gray-dark font-bold">
          <img src={`${window.location.origin}/logoblack.png`} alt="logo riffaa" className='cursor-pointer w-14 h-24'/>
        </div>
      </div>
      {/* Mobile Menu Button - aligned to start (right in RTL) */}
            <button
        className="md:hidden flex items-center p-2 text-white bg-gray-dark"
        onClick={toggleMenu}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
        </svg>
      </button>
      {/* Profile button - aligned left (right in RTL) on mobile */}
      {authState ? (
        <div className="md:hidden">
          <div className="relative inline-block">
            <button
              onClick={toggleDropdown}
              className="inline-flex justify-center w-full rounded-full border-none shadow-sm focus:outline-none hover:ring-2 hover:ring-offset-4 hover:ring-gray"
            >
              <div className='w-10 h-10 overflow-hidden rounded-full'>
                <img src="/teacher.jpg" className='w-full' alt="" />
              </div>
            </button>
            {isOpen && (
              <div className="origin-top-right absolute left-0 mt-2 w-56 rounded-md z-30 shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <Link 
                    href={''}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-light"
                  >
                    اعدادات الحساب
                  </Link>
                  <Link 
                    href={''}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-light"
                  >
                    المجموعات
                  </Link>
                  <button
                    onClick={handlelogout}
                    className="block w-full px-4 text-right py-2 text-sm text-gray-700 hover:bg-gray-light"
                  >
                    <FontAwesomeIcon icon={ faRightFromBracket } className='mx-2'/>
                    تسحيل الخروج
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="md:hidden"></div> // Empty div to maintain flex spacing
      )}

      {/* Desktop Navigation */}
      <nav className="hidden md:flex basis-1/2 justify-center">
        <ul className="flex flex-row text-lg justify-center space-x-6">
          <li></li>
          <li className="relative group">
            <Link href="/">
              الرئيسية
              <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
            </Link>
          </li>
          {user &&(
            <li className="relative group">
              <Link href="/dashboard">
                لوحة التحكم
                <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
              </Link>
            </li>
          )}
          <li className="relative group">
            <Link href="#about">
              من نحن
              <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
            </Link>
          </li>
          <li className="relative group">
            <Link href="#services">
              رؤيتنا
              <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
            </Link>
          </li>
          <li className="relative group">
            <Link href="#contact">
              اتصل بنا
              <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Desktop Auth Buttons */}
      {!authState ? 
        <button 
          onClick={handleClick}
          className="hidden md:flex relative overflow-hidden px-6 py-2 text-white bg-gray-dark border-none rounded-lg focus:outline-none transition-all duration-300 hover:bg-green"
        >
          <span className="relative z-10">تسجيل الدخول</span>
        </button>
        :
        <div className="hidden md:block relative inline-block">
          <button
            onClick={toggleDropdown}
            className="inline-flex justify-center w-full rounded-full border-none shadow-sm focus:outline-none hover:ring-2 hover:ring-offset-4 hover:ring-gray"
          >
            <div className='w-10 h-10 overflow-hidden rounded-full'>
              <img src="/teacher.jpg" className='w-full' alt="" />
            </div>
          </button>
          {isOpen && (
            <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md z-30 shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <Link 
                  href={''}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-light"
                >
                  اعدادات الحساب
                </Link>
                <Link 
                  href={''}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-light"
                >
                  المجموعات
                </Link>
                <button
                  onClick={handlelogout}
                  className="block w-full px-4 text-right py-2 text-sm text-gray-700 hover:bg-gray-light"
                >
                  <FontAwesomeIcon icon={ faRightFromBracket } className='mx-2'/>
                  تسحيل الخروج
                </button>
              </div>
            </div>
          )}
        </div>
      }
      

      
      {/* Mobile Menu - full width */}
      <div className={`fixed inset-0 bg-white z-50 md:hidden transition-transform transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="hamburger flex flex-col h-full w-full">
          <div className="flex justify-end p-4">
            <button
              className="text-gray-dark"
              onClick={toggleMenu}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div className='relative items-center w-1/3 mx-auto text-center group'>
            <div className="text-3xl text-gray-dark font-bold">رفعة</div>
            <span className="absolute left-0 bottom-0 w-full h-2.5 bg-green bg-opacity-80 transform scale-y-100  transition-all duration-300"></span>
          </div>

          <ul className="flex flex-col items-center space-y-4 mt-8">
            <li className="relative group" onClick={()=>setIsMenuOpen(false)}>
              <Link href="/">
                الرئيسية
                <span className="absolute left-0 bottom-0 w-full h-2 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
              </Link>
            </li>
            
            {authState && (
              <li className="relative group" onClick={()=>setIsMenuOpen(false)}>
                <Link href="/dashboard">
                  لوحة التحكم
                  <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
                </Link>
              </li>
            )}
            
            <li className="relative group" onClick={()=>setIsMenuOpen(false)}>
              <Link href="#about">
                من نحن
                <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
              </Link>
            </li>
            <li className="relative group" onClick={()=>setIsMenuOpen(false)}>
              <Link href="#services">
                رؤيتنا
                <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
              </Link>
            </li>
            <li className="relative group" onClick={()=>setIsMenuOpen(false)}>
              <Link href="#contact">
                اتصل بنا
                <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
              </Link>
            </li>
            
            {authState ? (
              <li className="relative group w-full px-4">
                <button
                  onClick={() => {
                    handlelogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-center py-3 text-white bg-red-500 rounded-lg flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} />
                  تسجيل الخروج
                </button>
              </li>
            ) : (
              <li>
                <button
                  className="relative overflow-hidden px-6 py-3 text-white bg-gray-dark border-none rounded-lg focus:outline-none transition-all duration-300 hover:bg-green"
                  onClick={handleClick}
                >
                  تسجيل الدخول
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </header>
    :
    <div></div>
    }
    </>
  );
};

export default Header;