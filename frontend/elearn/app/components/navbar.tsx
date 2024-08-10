// components/Navbar.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const Navbar: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState<boolean>(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 0);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 left-0 w-full transition-all duration-300 ease-in-out ${
                isScrolled
                    ? 'bg-white shadow-md'
                    : 'bg-transparent'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="text-xl font-semibold text-gray-900">
                            Brand
                        </Link>
                    </div>
                    <div className="hidden md:flex space-x-4">
                        <Link href="/" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                            Home
                        </Link>
                        <Link href="/about" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                            About
                        </Link>
                        <Link href="/services" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                            Services
                        </Link>
                        <Link href="/contact" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                            Contact
                        </Link>
                    </div>
                    <div className="-mr-2 flex md:hidden">
                        <button
                            className="inline-flex items-center justify-center p-2 text-gray-900 hover:text-gray-700 focus:outline-none"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
