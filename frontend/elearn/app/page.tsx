'use client'

import react, { useState } from 'react'
import Link from 'next/link'
import { useSelector } from 'react-redux'
import { BookOpen, GraduationCap, Activity } from 'lucide-react'
import Hero from './components/homecomponents/hero'
import Header from './components/homecomponents/header'
import Whyus from './components/homecomponents/whyus'
import Mission from './components/homecomponents/Mission'
import Review from './components/homecomponents/Review'
import TeacherSection from './components/homecomponents/teacher'
import FAQ from './components/homecomponents/FAQ'
import LanguageLearningSection from './components/homecomponents/languageTeaching'
import type { RootState } from '../store/store'


function CoursesCTA() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isTeacher = user?.role === 'teacher';

  return (
    <section className="mx-auto max-w-6xl px-6 py-12" dir="rtl">
      <div className="rounded-3xl bg-gradient-to-l from-orange-600 to-orange-400 p-8 text-white shadow-lg sm:p-12">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          {isTeacher ? 'أنشئ دورتك وانشر محتواك' : 'تعلّم من دورات أساتذتك'}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-orange-50 sm:text-base">
          {isTeacher
            ? 'ارفع الفيديوهات، نظّم الأقسام والدروس، وصمّم الاختبارات وتابع تقدم طلابك.'
            : 'شاهد الدروس، أكمل الدورات، واختبر معلوماتك مع متابعة تقدمك ونسخ الاستئناف.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={isTeacher ? '/courses/manage' : '/courses'}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-orange-700 transition hover:bg-orange-50"
          >
            {isTeacher ? <GraduationCap className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
            {isTeacher ? 'إدارة الدورات' : 'تصفح الدورات'}
          </Link>
          {!isTeacher ? (
            <Link
              href="/tracking"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/25"
            >
              <Activity className="h-4 w-4" /> متابعة تقدمي
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}


export default function HomePage() {

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
      <div className=' md:-mr-6 overflow-hidden bg-white'> 
        <Hero />

        <CoursesCTA />

        <div id="about">
        <Whyus/>

        </div>
        <div>
        <TeacherSection />

        </div>
        <div>
        <LanguageLearningSection />
        </div>
        <div id="services">
        <Mission/>

        </div>
        <div>
        <Review/>
          </div>
        <div id="contact">
        <FAQ/>

        </div>

      </div>
    )
}

