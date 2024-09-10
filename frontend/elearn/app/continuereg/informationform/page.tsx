"use client"
import React, {useState} from 'react'
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import Link from 'next/link';
import axiosClientInstance from '../../lib/axiosInstance';


const subjects = [
  { value: 'رياضيات', label: 'رياضيات' },
  { value: 'فيزياء', label: 'فيزياء' },
  { value: 'كيمياء', label: 'كيمياء' },
  { value: 'أحياء', label: 'أحياء' },
  { value: 'فرنسية', label: 'فرنسية' },
  { value: 'عربية', label: 'عربية' },
  { value: 'إنجليزية', label: 'إنجليزية' },
  { value: 'تاريخ', label: 'تاريخ' },
  { value: 'جغرافيا', label: 'جغرافيا' },
  { value: 'فلسفة', label: 'فلسفة' },
  { value: 'اقتصاد', label: 'اقتصاد' },
];

function CompletInformations() {
  
  const user = useSelector((state:RootState)=>state.auth.user)
  let first_name = user?.first_name
  let last_name = user?.last_name 

  const rolestate = useSelector((state: RootState) => state.auth.user?.role);
  const [phone_number, setPhone_number] = useState('');
  const [teaching_level, setTeaching_level] = useState('');
  const [teaching_subjects, setTeaching_subjects] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [degree, setDegree] = useState('');
  const [university, setUniversity] = useState('');
  const [branch, setBranch] = useState('');
  const [student_class, setStudent_class] = useState('');
  const [grade, setGrade] = useState('')
    
    interface FormData {
      phone_number: string;
      first_name:string;
      last_name:string;
      teaching_level: string;
      teaching_subjects: string;
      wilaya: string;
      degree: string;
      university: string;
      branch: string;
      student_class: string;
      grade: string;
    }

    const classChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setStudent_class(event.target.value);
      };
    
   
    const handleTeahcingSubjects = (event: React.ChangeEvent<HTMLSelectElement>) => {
      setTeaching_subjects(event.target.value);
    };
    
    
    const handelTachingLevel = (event: React.ChangeEvent<HTMLSelectElement>) => {
      setTeaching_level(event.target.value)
    };


    const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();

      try {
        let response;
        if (rolestate === 'teacher') {
          const data = {
            phone_number,
            first_name,
            last_name,
            teaching_level,
            teaching_subjects,
            wilaya,
            degree,
            university,
            
          };
          
          response = await axiosClientInstance.post('/teachers/', data);
        } else if (rolestate === 'student') {
          const data = {
            phone_number,
            first_name,
            last_name,
            teaching_level,
            teaching_subjects,
            wilaya,
            degree,
            university,
            
          };
          response = await axiosClientInstance.post('/students/', data);
        }
  
        console.log('Response:', response);
        // Handle success (e.g., display a success message, reset form, etc.)
      } catch (error) {
        console.error('Error submitting form:', error);
        // Handle error (e.g., display error message, etc.)
      }
    };

    if (!rolestate) {
        return <p>Loading...</p>; 
    }
  return (
    <div>
       <div className="flex md:px-10 md:py-10">
        {/* Right Pane */}
        <div className="w-full bg-white lg:w-1/2 flex items-center justify-center">
          <div className="max-w-md w-full p-6">
            <h1 className="text-3xl font-semibold mb-6 text-black text-center">اتمم تسجيل حسابك</h1>
            <h1 className="text-sm font-semibold mb-6 text-gray text-center">من أجل تجربة أفضل يرجى اتمام معلومات حسابك</h1>


            <form method="POST" className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="phone_number" className="block mb-2 text-sm font-medium text-gray ">رقم الهاتف</label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 top-0 flex items-center ps-3.5 pointer-events-none">
                      <svg className="w-4 h-4 text-gray" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 19 18">
                          <path d="M18 13.446a3.02 3.02 0 0 0-.946-1.985l-1.4-1.4a3.054 3.054 0 0 0-4.218 0l-.7.7a.983.983 0 0 1-1.39 0l-2.1-2.1a.983.983 0 0 1 0-1.389l.7-.7a2.98 2.98 0 0 0 0-4.217l-1.4-1.4a2.824 2.824 0 0 0-4.218 0c-3.619 3.619-3 8.229 1.752 12.979C6.785 16.639 9.45 18 11.912 18a7.175 7.175 0 0 0 5.139-2.325A2.9 2.9 0 0 0 18 13.446Z"/>
                      </svg>
                  </div>
                <input type="text" id="phone_number" className=" border text-black text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  "
                minLength={10} maxLength={10} 
                
                placeholder="123-456-7890"
                onChange={(e) => setPhone_number(e.target.value)} 
                />
            </div>

              </div>
              <div>
                <label className="block text-sm font-medium text-gray">الولاية</label>
                <input
                  type="text"
                  id="wilaya"
                  name="wilaya"
                  onChange={(e) => setWilaya(e.target.value)}
                  className="mt-1 p-2 w-full border rounded-md focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
                />
              </div>
              <div>
                <label htmlFor="teaching_level" className="block text-gray-700">اختيار الطور</label>
                <select
                  id="teaching_level"
                  value={teaching_level}
                  onChange={handelTachingLevel}
                  className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
                >
                  <option value="" disabled>اختيار</option>
                  <option value="MIDDLE">متوسط</option>
                  <option value="SECONDARY">ثانوي</option>
                </select>
              </div>
              {rolestate === 'teacher'? (
                <div className='space-y-4'>
               <div>
                <label htmlFor="subject" className="block text-gray-700">اختيار المادة  المدرسة</label>
                <select id="subject" value={teaching_subjects} onChange={handleTeahcingSubjects}
                        className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"

                >
                  <option value="" disabled>اخيتار المادة </option>
                  {subjects.map((subject) => (
                    <option key={subject.value} value={subject.value}>
                      {subject.label}
                    </option>
                  ))}
                </select>
                {teaching_subjects && <p> {teaching_subjects}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray">الشهادة المتحصل عليها</label>
                <input
                  type="degree"
                  id="degree"
                  name="degree"
                  onChange={(e) => setDegree(e.target.value)}
                  className="mt-1 p-2 w-full border rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray">الجامعة المانحة للشهادة</label>
                <input
                  type="uninveristy"
                  id="uninveristy"
                  name="uninveristy"
                  onChange={(e) => setUniversity(e.target.value)}
                  className="mt-1 p-2 w-full border rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
                />
              </div>
                </div>
              ): rolestate === 'student' ?(
                <div>
                <div>
                <label htmlFor="role" className="block text-gray-700">اختيار التخصص</label>
                <select
                  id="student_class"
                  value={student_class}
                  onChange={classChange}
                  className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
                >
                  <option value="" disabled>اختيار</option>
                  <option value="1st" >السنة الاولى</option>
                  <option value="2nd">السنة الثانية</option>
                  <option value="3rd">السنة الثالثة</option>
                  <option value="4th"> السنة الرابعة</option>
                </select>
              </div>
                </div>
              ):(
                <div> <Link href={'/continuereg/role'} /> قم باختيار نوع الحساب </div>
              )                 
              }

        
              <div>
                <button type="submit" className="w-full bg-gray-dark text-white p-2 rounded-md hover:bg-green focus:outline-none focus:bg-black focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors duration-300">تسجيل</button>
              </div>
            </form>
            
          </div>
        </div>
        {/* Left Pane */}
        <div className="hidden lg:flex items-center justify-center flex-1 bg-white text-black">
          <div className="max-w-md w-full text-center">
            <img className="w-full" src="/human.png" alt="" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompletInformations