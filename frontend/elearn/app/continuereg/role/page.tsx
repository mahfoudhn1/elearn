"use client"
import React, { useState } from 'react';
import { GraduationCap, School } from 'lucide-react'; // Modern icons from Lucide
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store/store'; // Adjust the import path for your AppDispatch type
import { useRouter } from 'next/navigation';
import updateUserRole from '../../../store/authThunks';

function ChooseRole() {
  const [role, setRole] = useState<string>('');
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const handleRoleSelection = async () => {
    if (!role) {
      alert('الرجاء اختيار دورك'); // Basic validation
      return;
    }

    const resultAction = await dispatch(updateUserRole(role));

    if (updateUserRole.fulfilled.match(resultAction)) {
      console.log('Role updated successfully:', resultAction.payload);
      router.push(`/continuereg/informationform?id=${resultAction.payload.id}`);
    } else {
      console.error('Failed to update role:', resultAction.error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-light p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          اختر دورك للبدء
        </h2>
        <div className="flex flex-col space-y-4">
          <div
            onClick={() => setRole('teacher')}
            className={`flex items-center justify-center p-6 rounded-lg cursor-pointer transition-all duration-300 ${
              role === 'teacher'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-light hover:bg-gray-300'
            }`}
          >
            <School className="w-8 h-8 mr-4" />
            <span className="text-xl font-semibold">أستاذ</span>
          </div>
          <div
            onClick={() => setRole('student')}
            className={`flex items-center justify-center p-6 rounded-lg cursor-pointer transition-all duration-300 ${
              role === 'student'
                ? 'bg-purple text-white shadow-lg'
                : 'bg-gray-light hover:bg-gray-300'
            }`}
          >
            <GraduationCap className="w-8 h-8 mr-4" />
            <span className="text-xl font-semibold">طالب</span>
          </div>
        </div>
        <button
          onClick={handleRoleSelection}
          className="w-full mt-8 bg-gradient-to-r from-gray-dark to-gray-700 text-white py-3 rounded-lg font-semibold hover:from-gray-700 hover:to-gray-dark transition-all duration-300"
        >
          متابعة التسجيل
        </button>
      </div>
    </div>
  );
}

export default ChooseRole;