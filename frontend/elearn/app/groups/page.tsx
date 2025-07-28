"use client"
import React, { useEffect, useState } from 'react'
import { Book, University, Blocks, School, GraduationCap, Languages } from 'lucide-react'
;
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

function Level() {
    const router = useRouter();

    const user = useSelector((state: RootState) => state.auth.user);
    const [isAuthorized, setIsAuthorized] = useState(false);
    
    useEffect(() => {
        if (!user) return; 

        if (user.role === "student") {
            router.push("/groups/allgroups");
        } else if (user.role === "teacher") {
            setIsAuthorized(true);
        }
    }, [user, router]);

    if (!isAuthorized) {
        return null; 
    }

    const levels = [
        { name: "ابتدائي", icon: <Blocks className="h-8 w-8 text-gray-800 transform transition-transform duration-200 ease-in-out hover:scale-125 group-hover:text-white" />, description: 'بما أن طلبتنا الأطفال الصغار سهل التشتيت احرص ان تقلل من عدد الطلبة في كل مجموعة' },
        { name: "متوسط", icon: <School className="h-8 w-8 text-gray-800 transform transition-transform duration-200 ease-in-out hover:scale-125 group-hover:text-white" />, description: 'انشىء و تفاعل مع طلبة المتوسط و لا تنسى وضع توقيت خاص بكل مجموعة' },
        { name: "ثانوي", icon: <Book className="h-8 w-8 text-gray-800 transform transition-transform duration-200 ease-in-out hover:scale-125 group-hover:text-white" />, description: 'لدى طلبة الثانوي مجموعة من التخصصات يجب اخذها بعين الاعتبار في كل مجموعة' },
        { name: "جامعي", icon: <University className="h-8 w-8 text-gray-800 transform transition-transform duration-200 ease-in-out hover:scale-125 group-hover:text-white" />, description: 'لدى طلبة الجامعة مجموعة من التخصصات يجب اخذها بعين الاعتبار في كل مجموعة' },
        { name: "تدرس حر", icon: <GraduationCap className="h-8 w-8 text-gray-800 transform transition-transform duration-200 ease-in-out hover:scale-125 group-hover:text-white" />, description: 'التعامل مع الطلبة الاحرار الذين يحضرون دورات أو دروس في مجال معين يكون أكثر مرونة' },
        { name: "لغات اجنبية", icon: <Languages className="h-8 w-8 text-gray-800 transform transition-transform duration-200 ease-in-out hover:scale-125 group-hover:text-white" />, "description": "تهدف هذه المجموعة إلى دعم الطلبة الأحرار في تعلم واكتساب اللغات الاجنبية, مع توفير المرونة اللازمة للتقدم في مساراتهم التعليمية." }
    ];

    function handleGroup(name: string) {
        if (name === "ثانوي") {
            router.push('/groups/secondary');
        } else {
            router.push(`/groups/allgroups?school_Level=${encodeURIComponent(name)}`);
        }
    }

    return (
        <div className="min-h-screen bg-gray-light p-6 flex">

            <div className='m-auto p-8 h-screen'>
                <h1 className='text-xl text-center font-semibold text-gray-700 p-4'>يرجي اختيار الطور الدراسي</h1>
                <div className="max-w-5xl mt-2 mx-auto">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 not-prose">
                        {levels.map((level, index) => (
                            <div
                                key={index}
                                onClick={() => handleGroup(level.name)}
                                className="relative cursor-pointer flex flex-col items-start justify-between p-6 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 group hover:scale-105 transition-all ease-in-out duration-300 shadow-lg"
                            >
                                <span className="absolute w-full h-full inset-0 bg-white group-hover:bg-gray-light group-hover:bg-opacity-30 pointer-events-none"></span>
                                <div className="flex items-center justify-between w-full mb-4 relative">
                                    <div className="flex items-center justify-center space-x-3">
                                        <span className="text-gray-800 group-hover:text-white ml-4">{level.icon}</span>
                                        <span className="text-lg font-semibold text-gray-800 group-hover:text-white transition-colors duration-300 ease-in-out">
                                            {level.name}
                                        </span>
                                    </div>
                                    <span className="opacity-0 -translate-x-2 flex-shrink-0 group-hover:translate-x-0 py-1 px-2.5 text-[0.6rem] group-hover:opacity-100 transition-all ease-out duration-200 rounded-full bg-blue text-white flex items-center justify-center">
                                        <span>افتح المجموعات</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 translate-x-0.5 h-3">
                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                </div>
                                <span className="relative text-xs md:text-sm text-gray-600">{level.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Level;

