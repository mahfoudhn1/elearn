"use client"

import React, { useEffect, useState } from 'react'

import axiosClientInstance from '../../../lib/axiosInstance';
import { Student } from '../../../types/student';
import { Grade } from '../../../types/student';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

function CreateGroup() {

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [grade, setGrade] = useState<Grade[]>([]);
  const [name, setName] = useState<string>()
  const [selectedGrade, setSelectedGrade] = useState<Grade | undefined>();
  const [filteredStudents, setFilteredStudents] = useState(students);
  
  const searchParams = useSearchParams()
  const school_Level = searchParams.get('school_Level')
  const field_of_study = searchParams.get('field')
  const router = useRouter()
  const pathname = usePathname();
  const newPath = pathname.replace("/create", "");

  const queryString = searchParams.toString();
  const newUrl = queryString ? `${newPath}?${queryString}` : newPath;


  useEffect(() => {
    
    const fetchStudents = () => {
      axiosClientInstance
        .get(`/subscriptions/subscribed_students/`)
        .then((response) => {
          setStudents(response.data);
        })
        .catch((error) => {
          console.error('Error fetching students:', error);

        });
    };
    const fetchGrade = ()=>{
      axiosClientInstance.get(`/grades/?school_level=${school_Level}`)
      .then((response) => {
        
        setGrade(response.data);
      })
      .catch((error) => {
        console.error('Error fetching students:', error);

      });
    }
    fetchGrade();
    fetchStudents();
  }, []);

  

  const handleGradeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGradeName = event.target.value;

    const selectedGradeObj = grade.find((g) => g.name === selectedGradeName);
    
    setSelectedGrade(selectedGradeObj); 

    if (selectedGradeObj) {
      const filtered = students.filter((student) => student.grade.id === selectedGradeObj.id);
      
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  };

  const handleCheckboxChange = (student: Student) => {
    setSelectedStudents(prevSelected => {
      if (prevSelected.some(s => s.id === student.id)) {
        return prevSelected.filter(s => s.id !== student.id);
      } else {
        return [...prevSelected, student];
      }
    });
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    
    const dataToSubmit: any = {
      name: name,
      students: selectedStudents.map((student) => student.id),
      grade: selectedGrade?.id,
      school_level: school_Level,
    };
  
    if (field_of_study) {
      dataToSubmit.field_of_study = field_of_study;
    }
  
    try {
      const response = await axiosClientInstance.post('/groups/', dataToSubmit);
      console.log('Response:', response.data);
      window.location.replace(newUrl);

    } catch (error) {
      console.error('Error submitting data:', error);
    }
  };
  
  

  return (
    <div className='p-10 mx-auto flex flex-col justify-center'>
     
      <form className="w-full max-w-lg" onSubmit={handleSubmit}>
  <div className="flex flex-wrap -mx-3 mb-6">
    <div className="w-full md:w-full px-3 mb-6 md:mb-0">
      <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="grid-first-name">
        اسم المجموعة
      </label>
      <input className="appearance-none block w-full bg-gray-200 text-gray-700 border border-red-500 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white" id="grid-first-name" type="text" placeholder="مجموعة 1"
        value={name || ""}
        onChange={(e) => setName(e.target.value)}
      />
      <p className="text-red-500 text-xs italic">الرجاء ملىء هذه.</p>
    </div>

  </div>

  <div className="flex flex-wrap -mx-3 mb-6">
    <div className="w-full px-3">
      <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="grid-password">
        المستوى الدراسي
      </label>
      <div className="relative">
        <select className="block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500" id="grid-state"
          onChange={handleGradeChange}
          value={selectedGrade?.name || ''} 
          >
          <option >اختيار المستوى</option>
          {grade.map((g) => (
          <option key={g.id} value={g.name}>
            {g.name}
          </option>
        ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
    </div>
  </div>
</form>
{filteredStudents.map((student:Student)=>(
    <div key={student.id}
    className='flex flex-col mb-2'
    >
      <div className="relative max-w-sm flex w-full flex-col rounded-xl bg-white shadow">

          <div
            role="button"
            className="flex w-full items-center rounded-lg p-0 transition-all hover:bg-gray-100 focus:bg-gray-100 active:bg-gray-100"
          >
              <label
                htmlFor={`${student.id}`}
                className="flex w-full cursor-pointer items-center px-3 py-2"
              >
                <div className="inline-flex items-center">
                  <label className="flex items-center cursor-pointer relative" htmlFor={`${student.id}`}>
                    <input type="checkbox"
                    
                      className="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded shadow hover:shadow-md border border-gray-300 checked:bg-gray-800 checked:border-gray-800"
                      id={`${student.id}`} 
                      checked={selectedStudents.some(s => s.id === student.id)}
                      onChange={() => handleCheckboxChange(student)}
                      />
                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"
                        strokeWidth="currentColor" >
                        <path fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"></path>
                      </svg>
                    </span>
                  </label>
                  <label className="cursor-pointer ml-2 text-gray-600 text-sm" htmlFor={`${student.id}`}>
                    { student.user.first_name } {student.user.last_name}
                  </label>
                  {grade.find(g => g.id === student?.grade.id)?.name || "Grade not found"}
                  </div>
              </label>
            </div>


            </div>
        </div>
      ))}
    <button className='text-white bg-gray-800 border-none rounded-lg px-4 py-2 ' 
      onClick={handleSubmit}
    > Submit </button>
    </div>

  )
}

export default CreateGroup




