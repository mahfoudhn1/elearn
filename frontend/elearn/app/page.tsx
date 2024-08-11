'use client'

import react, { useState } from 'react'
import Navbar from './components/navbar'
import Hero from './components/hero/hero'
import Header from './components/header/header'
import Whyus from './components/whyus/whyus'
import Mission from './components/ourmission/Mission'
import Review from './components/ourClients/Review'
import TeacherSection from './components/teacher/teacher'
import FAQ from './components/FAQ/FAQ'


export default function page() {
// 
const [isLoading, setIsLoading] = useState(true);

const timer = setTimeout(() => {
  setIsLoading(false);
}, 1000); 

if (isLoading) {
  return(<div className="flex justify-center items-center h-screen bg-gray-200">
    <div className="w-16 h-16 border-4 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
  </div>) 
}
  return (
    <div> 
      <Header/>
      <Hero />
      <Whyus />
      <TeacherSection />
      <Mission/>
      <Review/>
      <FAQ/>
    </div>
  )
}
