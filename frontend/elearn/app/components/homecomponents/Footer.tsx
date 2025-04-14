"use client"
import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Mail } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-gray-light text-black py-12 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-green bg-opacity-10"></div>
      <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-green bg-opacity-10"></div>

      <div className="container mx-auto px-4">
        {/* Logo and Title - Centered */}
        <div className="flex flex-col items-center mb-12">
          <div className="mb-4">
            <img 
              src={`${window.location.origin}/logoblack.png`} 
              alt="logo riffaa" 
              className='w-20 h-auto mx-auto transition-transform hover:scale-105 duration-300'
            />
          </div>
          <h3 className="text-2xl font-bold text-center text-gray-dark mb-2">منصة رِفعة التعليمية</h3>
          <p className="text-lg text-center max-w-md">بوابتك نحو تعليم مميز وتجربة تعلم فريدة</p>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Quick Links */}
          <div className="text-center md:text-right">
            <h4 className="text-xl font-semibold mb-6 relative inline-block">
              روابط سريعة
              <span className="absolute bottom-0 right-0 w-full h-1 bg-green bg-opacity-50"></span>
            </h4>
            <ul className="space-y-4">
              {[
                { href: "#home", text: "الرئيسية" },
                { href: "#about", text: "من نحن" },
                { href: "#services", text: "رؤيتنا" },
                { href: "#contact", text: "اتصل بنا" },
                { href: "/privacy-policy", text: "سياسة الخصوصية" }
              ].map((item) => (
                <li key={item.text} className="group">
                  <Link href={item.href} className="hover:text-green transition-colors duration-300">
                    {item.text}
                    <span className="block h-0.5 w-0 bg-green group-hover:w-full transition-all duration-300"></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-center">
            <h4 className="text-xl font-semibold mb-6 relative inline-block">
              تواصل معنا
              <span className="absolute bottom-0 right-0 w-full h-1 bg-green bg-opacity-50"></span>
            </h4>
            <div className="space-y-4">
              <p className="flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-5 h-5 text-green" />
                support@riffaa.com
              </p>
              <p className="flex items-center justify-center text-right md:justify-start gap-2">
                <svg className="w-5 h-5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                213665689212+  
              </p>
            </div>
          </div>

          {/* Social Media */}
          <div className="text-center md:text-right">
          <h4 className="text-xl font-semibold mb-6 relative inline-block">
              مواقع التواصل
              <span className="absolute bottom-0 left-0 w-full h-1 bg-green bg-opacity-50"></span>
            </h4>
            <div className="flex justify-center md:justify-start gap-6">
              <a href="https://www.facebook.com/profile.php?id=61564466407863&mibextid=ZbWKwL" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white shadow-md hover:bg-green hover:text-white transition-all duration-300">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="https://instagram.com/rifaa_dz" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white shadow-md hover:bg-purple hover:text-white transition-all duration-300">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="mailto:support@riffaa.com" className="p-2 rounded-full bg-white shadow-md hover:bg-red-500 hover:text-white transition-all duration-300">
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-gray-300 text-center">
          <p className="text-gray-700">
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} لمنصة رِفعة التعليمية
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;