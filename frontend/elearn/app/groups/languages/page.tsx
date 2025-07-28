"use client"
import React, { useState, FC, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactCountryFlag from "react-country-flag";
import axiosClientInstance from '../../lib/axiosInstance';

interface LanguageGroup {
  id: number;
  name: string;
  country_code: string;
  description: string;
}

const LanguageGroupsList: FC = () => {
  const [languages, setLanguages] = useState<LanguageGroup[]>([]);
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await axiosClientInstance.get('/lan/languages/');
        if (!response) {
          throw new Error('Failed to fetch languages');
        }
        const data = await response.data;
        setLanguages(data);
      } catch (error) {
        console.error('Error fetching languages:', error);
      }
    };

    fetchLanguages();
  }, []);

  
  
  const router = useRouter();
  const school_Level = "لغات اجنبية";
  
  const handleGroup = (name: string) => {
    router.push(`/groups/allgroups?lang=${name}&school_Level=${encodeURIComponent(school_Level)}`);
  }

  return (
    <div className="flex flex-row w-full h-full">
      <div className="w-full bg-gray-100 flex flex-col">
        <div className="text-center my-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            اختر اللغة
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            اختر اللغة التي تريد تعلمها 
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8">
          {languages.map((language) => (
            <div key={language.id} 
              className="relative flex flex-col justify-center overflow-hidden bg-gray-100"
              onClick={() => handleGroup(language.name)}
            >
              <div className="group relative cursor-pointer overflow-hidden bg-white px-6 pt-10 pb-8 shadow-xl ring-1 ring-gray-800/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:mx-auto sm:max-w-sm sm:rounded-lg sm:px-10">
                
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                  <ReactCountryFlag
                    countryCode={language.country_code}
                    svg
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                              w-20 h-20 rounded-full opacity-0 transition-all duration-300 
                              group-hover:scale-[25] group-hover:rounded-none group-hover:opacity-100"
                    style={{
                      objectFit: 'cover'
                    }}
                  />
                </div>
                
                <div className="relative z-10 mx-auto max-w-md">
                  <div className="flex items-center">
                    <div className="mr-3 transition-all duration-300 group-hover:scale-110">
                      <ReactCountryFlag
                        countryCode={language.country_code}
                        svg
                        style={{
                          width: '3em',
                          height: '3em',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          boxShadow: '0 0 8px rgba(0,0,0,0.2)',
                          transition: 'transform 0.3s ease'
                        }}
                        title={language.name}
                      />
                    </div>
                    <div className="px-3 py-1 rounded-md transition-all duration-300 group-hover:bg-black">
                      <h1 className='text-gray-800 group-hover:text-white text-xl font-semibold transition-colors duration-300'>
                        {language.name}
                      </h1>
                    </div>
                  </div>
                  <div className="space-y-6 pt-5 text-base leading-7 text-gray-600 transition-all duration-300 group-hover:text-white/90 p-4 group-hover:bg-black/50">
                    <div> 
                      <p className="font-medium">{language.description}</p> 
                    </div>
   
                  </div>
                  <div className="pt-5 text-base font-semibold leading-7">
                    <p>
                      <a href="#" className="text-sky-500 transition-all duration-300 group-hover:text-white">
                        المزيد من التفاصيل &rarr;
                      </a>
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

export default LanguageGroupsList;

