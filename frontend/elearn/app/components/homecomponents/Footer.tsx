"use client"
import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Mail } from 'lucide-react'; // Import Lucide icons

function Footer() {
  return (
    <footer className="bg-gray-light text-black py-8">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center px-4">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center md:items-start mb-6 md:mb-0">
        <div className="text-3xl w-2/3 text-gray-dark font-bold">
          <img src={`${window.location.origin}/logoblack.png`} alt="logo riffaa" className='cursor-pointer w-14 h-24'/>
         </div>
          <p className="text-center md:text-left text-lg">رفعة- افضل منصة تعليمية</p>
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
        </div>
        
        {/* Social Media Icons */}
        <div className="flex ">
          <a 
            href="https://facebook.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-700 mx-6 hover:text-blue-500 transition-colors duration-300"
          >
            <Facebook className="w-8 h-8 hover:scale-110 transition-transform duration-300" />
          </a>
          <a 
            href="https://instagram.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-700 mx-6 hover:text-purple transition-colors duration-300"
          >
            <Instagram className="w-8 h-8 hover:scale-110 transition-transform duration-300" />
          </a>
          <a 
            href="mailto:example@example.com" 
            className="text-gray-700 mx-6 hover:text-red-500 transition-colors duration-300"
          >
            <Mail className="w-8 h-8 hover:scale-110 transition-transform duration-300" />
          </a>
        </div>
        
      </div>
    </footer>
  );
}

export default Footer;