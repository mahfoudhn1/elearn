"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
// import './Header.css'
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { logout } from '../../../store/authSlice';
const Header: React.FC = () => {
  
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const toggleMenu =()=>{
    setIsMenuOpen(!isMenuOpen)
  }
  const [isOpen, setIsOpen] = useState(false);

  const dispatch = useDispatch<AppDispatch>()

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  const router = useRouter()

  const pathname = usePathname(); 
  
  const dashboardPaths = ['/dashboard', '/groups', '/flashcards', '/notes', '/teachers', '/notifications','/lives'];
  const isDashboard = dashboardPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
  
  const isHomePage = pathname === '/' 
  
  const handleClick = () => {


    router.push('/login'); 
    setIsMenuOpen(false)
    
  };
  
  const authState = useSelector((state:RootState)=> state.auth.isAuthenticated)

  const handlelogout =()=>{
    dispatch(logout())
  }
  return (
    <>
    {!isDashboard ?

    <header className={`header flex justify-between items-center py-4 bg-transparent px-20  w-full text-black ${!isHomePage? "shadow-sm sticky" : "shadow-none" } `}>
    <div className='relative group w-1/4'>
      <div className="text-3xl w-2/3 text-gray-dark font-bold">
        <img src="./logo1.png" alt="logo riffaa" className='cursor-pointer'/>
         </div>
      {/* <span className="absolute left-0 bottom-0 w-full h-2.5 bg-green bg-opacity-80 transform scale-y-100  transition-all duration-300"></span> */}

    </div>

    <nav className="hidden md:flex basis-1/2 justify-center">
      <ul className="flex flex-row text-lg justify-center space-x-6">
        <li></li>
        <li className="relative group">
          <Link href="/">
          الرئيسية
            <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
          </Link>
        </li>
        <li className="relative group">
          <Link href="#about">
          من نحن
            <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
          </Link>
        </li>
        <li className="relative group">
          <Link href="#services">
          خدماتنا
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
    
    {!authState? 
    
    <button 
        onClick={handleClick}
    
    className="hidden md:flex relative overflow-hidden px-6 py-2 text-white bg-gray-dark border-none rounded-lg focus:outline-none transition-all duration-300 hover:bg-green">
      <span className="relative z-10">تسجيل الدخول</span>
    </button>
  :
  <div className="relative inline-block ">
      <button
        onClick={toggleDropdown}
        className="inline-flex justify-center w-full rounded-full border-none shadow-sm  focus:outline-none hover:ring-2 over:ring-offset-4 hover:ring-gray  "
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
    
    
    <button
        className="md:hidden flex items-center p-2 text-white bg-gray-dark"
        onClick={toggleMenu}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
        </svg>
      </button>
      {/* Mobile Menu */}
      <div className={`fixed inset-0 bg-white z-50 md:hidden transition-transform transform 
        ${isMenuOpen ? 'translate-x-8' : 'translate-x-full'}`}>
        <div className="hamburger flex flex-col h-full ">
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
            <div className="text-3xl text-gray-dark font-bold">منبت</div>
            <span className="absolute left-0 bottom-0 w-full h-2.5 bg-green bg-opacity-80 transform scale-y-100  transition-all duration-300"></span>

          </div>

          <ul className="flex flex-col items-center space-y-4 mt-8">
            <li className="relative group "
            onClick={()=>setIsMenuOpen(false)}
          >
          
              <Link href="/">
              الرئيسية
                <span className="absolute left-0 bottom-0 w-full h-2 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
              </Link>
            </li>
            <li className="relative group "  onClick={()=>setIsMenuOpen(false)}>
              <Link href="#about">
              من نحن
                <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
              </Link>
            </li>
            <li className="relative group " onClick={()=>setIsMenuOpen(false)}>
              <Link href="#services">
              خدماتنا
                <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
              </Link>
            </li>
            <li className="relative group " onClick={()=>setIsMenuOpen(false)}>
              <Link href="#contact">
                اتصل بنا
                <span className="absolute left-0 bottom-0 w-full h-0 bg-green bg-opacity-50 transform scale-y-0 group-hover:h-2.5 group-hover:scale-y-100 transition-all duration-300"></span>
              </Link>
            </li>
            <li>
            
              <button
                className="relative overflow-hidden px-6 py-3 text-white bg-gray-dark border-none rounded-lg focus:outline-none transition-all duration-300 hover:bg-green"
                onClick={handleClick}
                >
                تسجيل الدخول
              </button>
            </li>
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
