"use client"
import React, { useState, FC, useEffect } from 'react';
import Navbar from '../components/dahsboardcomponents/navbar';
import Sidebar from '../components/dahsboardcomponents/sidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faCompassDrafting, faFlask, faLandmark, faLanguage, faRuler, faSquareRootAlt } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import axiosClientInstance from '../lib/axiosInstance';




interface GradeIcon {
  icon: any;
  bgColor: string;
}
interface fieldofstudy{
  id:number;
  name:string
}
interface schoolLevel{
  id:number;
  name:string;
}


const gradeIconMapping: { [key: string]: GradeIcon } = {
  'رياضيات': { icon: faSquareRootAlt, bgColor: 'bg-blue' },
  'نقني رياضي': { icon: faCompassDrafting, bgColor: 'bg-orange' },
  'علوم تجريبية': { icon: faFlask, bgColor: 'bg-green' },
  'تسيير و  اقتصاد': { icon: faLandmark, bgColor: 'bg-gray-dark' },
  'ادب و فلسفة': { icon: faBook, bgColor: 'bg-yellow-400' },
  'لغات اجنبية': { icon: faLanguage, bgColor: 'bg-purple-600' },

};

const GroupsList: FC = () => {

  const [fieldofstudy, setfieldofstudy] = useState<fieldofstudy[]>([]);
  const [schoolLevel, setSchoolLevel] = useState<schoolLevel>()
  const router = useRouter()
  

  useEffect(()=>{
    const fetchGrades = async () => {
      try {
        const response = await axiosClientInstance.get('/groups/fieldofstudy/'); 
        setfieldofstudy(response.data); 

      } catch (error) {
        console.error('Error fetching grades:', error);

      }
    };

    fetchGrades();
  }, []);

  const school_Level = "ثانوي"
  
  const handelGroup = (id: number)=>{
    router.push(`/groups/${id}?school_Level=${school_Level}`);
    }

  return (
    <div className="flex flex-row w-full h-full">
      <Sidebar />
      <div className="w-full bg-gray-300 flex flex-col">
        <Navbar />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8">
          
          {fieldofstudy.map((field) => (
            <div key={field.id} 
              className="relative flex flex-col justify-center overflow-hidden bg-gray-300"
              onClick={() => handelGroup(field.id)}
            >
              <div className="group relative cursor-pointer overflow-hidden bg-white px-6 pt-10 pb-8 shadow-xl ring-1 ring-gray-800/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:mx-auto sm:max-w-sm sm:rounded-lg sm:px-10">
                <span className={`absolute top-10 z-0 h-20 w-20 rounded-full ${gradeIconMapping[field.name]?.bgColor} transition-all duration-300 group-hover:scale-[10]`}></span>
                <div className="relative z-10 mx-auto max-w-md">
                  <div className="flex">
                  <span className={`grid h-20 w-20 place-items-center rounded-full ${gradeIconMapping[field.name]?.bgColor} transition-all duration-300 group-hover:${gradeIconMapping[field.name]?.bgColor}`}>
                  <FontAwesomeIcon icon={gradeIconMapping[field.name]?.icon} className='text-2xl text-gray-300' />
                    </span>
                    <h1 className='text-gray-dark group-hover:text-white text-xl font-semibold'>{field.name}</h1>
                  </div>
                  <div className="space-y-6 pt-5 text-base leading-7 text-gray-600 transition-all duration-300 group-hover:text-white/90">
                  <div> <p> يمكنك إنشاء مجموعات تخصصية للتواصل مع الطلبة وجدولة بثوث أسبوعية مباشرة، مع تحديد عدد الطلبة في كل مجموعة إلى 30 لضمان أفضل تجربة تعليمية. </p> </div>
                    
                    <div> <p>عدد المجموعات: </p> </div>
                    
                  </div>
                  <div className="pt-5 text-base font-semibold leading-7">
                    <p>
                      <a href="#" className="text-sky-500 transition-all duration-300 group-hover:text-white">Read the docs &rarr;</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupsList;
