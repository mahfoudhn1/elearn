"use client"
import React, {useState} from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChalkboardTeacher, faUserGraduate } from '@fortawesome/free-solid-svg-icons';
import updateUserRole  from '../../../store/authThunks';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store/store'; // Adjust the import path for your AppDispatch type
import { useRouter } from 'next/navigation';



function ChooseRole() {
    const [role, setRole] = useState<string>('');
    const dispatch = useDispatch<AppDispatch>();    

    const router = useRouter();

    const choosenRole = async () => {

        const resultAction = await dispatch(updateUserRole(role));

        // Check if the action was successful
        if (updateUserRole.fulfilled.match(resultAction)) {
            console.log('Role updated successfully:', resultAction.payload);
            router.push('/continuereg/informationform')
        } else {
            console.error('Failed to update role:', resultAction.error.message);
        }
    };

  return (
    <div>
        <div className="p-4 shadow-black shadow-sm m-10 flex flex-col text-center space-y-8 justify-center bg-white rounded">
          <div>
            <h2 className="text-lg font-semibold mb-4">اختير كيفية التسجيل</h2>
            <div className="flex justify-center space-x-4 text-2xl ">
              <div
                onClick={() => setRole('teacher')}
                className={`py-2 cursor-pointer flex flex-col justify-center text-center px-4 ${role === 'teacher' ? 'bg-gray-dark text-white' : 'bg-gray-200'}`}
              >
                <FontAwesomeIcon icon={faChalkboardTeacher} className='h-6 text-center w-6'/>
                استاذ
              </div>
              <div
                onClick={() => setRole('student')}
                className={`py-2 cursor-pointer flex flex-col justify-center text-center px-4 ${role === 'student' ? 'bg-gray-dark text-white' : 'bg-gray-200'}`}
              >
                <FontAwesomeIcon icon={faUserGraduate} className='h-6 text-center w-6'/>
                طالب
              </div>
            </div>
            <button type='submit'
            onClick={choosenRole}
            className='bg-gray-dark mt-6 py-2 px-4 text-white transition-colors hover:bg-green rounded '
            >
               متابعة التسجيل 
            </button>
            
          </div>
    </div>
    </div>
  )
}

export default ChooseRole

function dispatch(arg0: any) {
    throw new Error('Function not implemented.');
}
