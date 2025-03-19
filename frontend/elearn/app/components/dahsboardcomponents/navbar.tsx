"use client"
import Link from 'next/link';
import React, { useState } from 'react'
import { useDispatch, UseDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { logout } from '../../../store/authSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';

function Navbar() {
  const pathname = usePathname(); 
  
  const dashboardPaths = ['/login', '/register','/', '/continuereg'];
  const isDashboard = dashboardPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
  
    const dispatch = useDispatch<AppDispatch>()

    const [isOpen, setIsOpen] = useState(false);
    const toggleDropdown = () => {
        setIsOpen(!isOpen);
      };
    
    
      const handlelogout =()=>{
        dispatch(logout())
    }
    const user = useSelector((state:RootState)=>state.auth.user)
    // console.log(user);
    
  return (
    <>
    {!isDashboard && (

    <nav className="bg-white  top-0 left-0 w-full flex items-center justify-between px-6 py-1 mb-4">
        <div className="flex-grow mx-4">
      <input
        type="text"
        placeholder="ابحث عن أي شيء..."
        className="w-full px-4 py-2 text-sm border-none rounded-full focus:outline-none "
      />
    </div>
    {/* Menu Button */}
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center rounded-full focus:outline-none hover:ring-2 hover:ring-offset-4 hover:ring-gray-300"
      >
        <div className="w-10 h-10 overflow-hidden rounded-full">
          {user ? (
            <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" />

          ):
            <img src="/teacher.jpg" className="w-full h-full object-cover" alt="Profile" />
          }
        </div>
      </button>

      {isOpen && (
        <div className="origin-top-left absolute left-0 mt-2 w-56 rounded-md z-30 shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <Link href="" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              اعدادات الحساب
            </Link>
            <Link href="" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              المجموعات
            </Link>
            <button
              onClick={handlelogout}
              className="block w-full px-4 py-2 text-right text-sm text-gray-700 hover:bg-gray-100"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="mx-2" />
              تسحيل الخروج
            </button>
          </div>
        </div>
      )}
    </div>

    {/* Search Input */}

  </nav>
    )}
    </>
  )
}

export default Navbar