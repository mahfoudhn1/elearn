"use client"
import React, {useState} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { login } from '../../store/authThunks';
import Link from 'next/link';

const Loginpage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const loginStatus = useSelector((state: RootState) => state.auth.registrationStatus);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(login({ username, password }));
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen ">
        <div className='w-full border-none items-center justify-center text-center mb-5'>
        <Link href='/register'
            className=" py-2 px-5 border-none bg-gray-dark text-center text-white font-semibold rounded-lg shadow-md hover:bg-green focus:outline-none "
          >
            انشاء حساب جديد

          </Link>
        </div>
      <div className="w-full max-w-md p-8 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">سجل الدخول</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-black">اسم المستخدم</label>
            <input
              id="username"
              type="text"
              placeholder="username"
              onChange={(e) => setUsername(e.target.value)} 

              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-black">كلمة المرور</label>
            <input
              id="password"
              type="password"
              placeholder="********"
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-3 py-2 border border-gray rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-gray-dark text-white font-semibold rounded-lg shadow-md hover:bg-green focus:outline-none focus:ring-2 focus:ring-gray-dark"
          >
            سجل الدخول

          </button>
        </form>
      </div>
    </div>
  );
};

export default Loginpage;
