'use client'

import react, { useState } from 'react'
import Hero from './components/homecomponents/hero'
import Header from './components/homecomponents/header'
import Whyus from './components/homecomponents/whyus'
import Mission from './components/homecomponents/Mission'
import Review from './components/homecomponents/Review'
import TeacherSection from './components/homecomponents/teacher'
import FAQ from './components/homecomponents/FAQ'


export default function page() {

  const [isLoading, setIsLoading] = useState(true);
  const timer = setTimeout(() => {
    setIsLoading(false);
  }, 1000); 

  if (isLoading) {
    return(<div className="flex justify-center w-full items-center h-screen bg-gray-200">
      <div className="w-16 h-16 border-4 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
    </div>) 
  }
    return (
      <div className='w-full md:-mr-6 bg-white'> 
        <Hero />
        <Whyus />
        <TeacherSection />
        <Mission/>
        <Review/>
        <FAQ/>
      </div>
    )
}
