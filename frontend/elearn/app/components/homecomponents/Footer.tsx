import React from 'react';
import Link from 'next/link';

function Footer() {
  return (
    <footer className="bg-gray-light text-black py-8">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center px-4">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center md:items-start mb-6 md:mb-0">
          <h1 className='text-3xl font-bold mb-4'>منبت</h1>
          <p className="text-center md:text-left text-lg">رفعة- تطوير التعليم</p>
        </div>
        
        {/* Links Section */}
        <div className="flex flex-col md:flex-row mb-6 md:mb-0">
          <nav className="hidden md:flex md:flex-row basis-1/2 justify-center">
            <ul className="flex flex-col w-full text-lg justify-center space-y-6">
              <li className="relative group">
                <Link href="#home">
                  
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
        </div>
        
        {/* Contact Form */}
        <div className="w-full md:w-1/3">
          <h5 className="font-bold mb-4">تواصل معنا</h5>
          <form className="space-y-4" >
            <input 
              type="email" 
              placeholder="Email" 
              className="w-full p-2 bg-gray-700 border border-white rounded-lg placeholder-gray-400"
              aria-label="Email"
            />
            <input 
              type="tel" 
              placeholder="Phone" 
              className="w-full p-2 bg-gray-700 border border-white rounded-lg placeholder-gray-400"
              aria-label="Phone"
            />
            <textarea 
              placeholder="Your Message" 
              className="w-full p-2 bg-gray-700 border border-white rounded-lg placeholder-gray-400"
              aria-label="Your Message"
            ></textarea>
            <button 
              type="submit" 
              className="px-4 bg-gray-dark hover:bg-green text-white py-2 rounded-lg"
            >
              Send
            </button>
          </form>
        </div>
        
      </div>
    </footer>
  );
}

export default Footer;
