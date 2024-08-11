"use client";

import React, { useState } from 'react'

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { register } from '../../store/authThunks';


export default function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>();
  const registrationStatus = useSelector((state: RootState) => state.auth.registrationStatus);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [role, setRole] = useState('');

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(event.target.value);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(register({ username, email, password, password2, role }));
  };
  return (
    <>

<div className="flex md:px-10 md:py-10 ">
   
   {/* <!-- Right Pane --> */}
   <div className="w-full bg-white lg:w-1/2 flex items-center justify-center">
     <div className="max-w-md w-full p-6">
       <h1 className="text-3xl font-semibold mb-6 text-black text-center">سجل حسابك</h1>
       <h1 className="text-sm font-semibold mb-6 text-gray text-center">سجل و احصل على أفضل تجربة تعليم, مرونة و نجاعة في ايصال المعلومة </h1>
       <div className="mt-4 flex flex-col lg:flex-row items-center justify-between">
         <div className="w-full lg:w-1/2 mb-2 lg:mb-0">
           <button type="button" className="w-full flex justify-center items-center gap-2 bg-white text-sm text-gray-600 p-2 rounded-md hover:bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2  transition-colors duration-300">
           <img src="/google.svg" alt="" className='h-6 w-6'/>
           سجل بحسابك على جوجل </button>
         </div>
         
       </div>
       <div className="mt-4 text-sm text-gray text-center">
         <p>أو قم بادخال معلوماتك</p>
       </div>
       <form  method="POST" className="space-y-4" onSubmit={handleSubmit}>
         
         <div>
           <label className="block text-sm font-medium text-gray">اسم المستخد</label>
           <input 
           type="text" 
           id="username" 
           name="username" 
           onChange={(e) => setUsername(e.target.value)} 
           className="mt-1 p-2 w-full border rounded-md focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"/>
         </div>
         <div>
           <label className="block text-sm font-medium text-gray">البريد الالكتروني</label>
           <input 
           type="text" 
           id="email" 
           name="email" 
           onChange={(e) => setEmail(e.target.value)} 
           className="mt-1 p-2 w-full border rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"/>
         </div>
         <div>
           <label className="block text-sm font-medium text-gray">كلمة المرور</label>
           <input 
             type="password" 
             id="password" 
             name="password" 
             onChange={(e) => setPassword(e.target.value)} 

             className="mt-1 p-2 w-full border rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
             />

         </div>
         <div>
           <label className="block text-sm font-medium text-gray"> تأكيد كلمة المرور</label>
           <input 
             type="password" 
             id="password2" 
             name="password2" 
             onChange={(e) => setPassword2(e.target.value)} 

             className="mt-1 p-2 w-full border rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
             />

         </div>
         <div>
         <label htmlFor="role" className="block text-gray-700">معلم او طالب </label>
         <select
           id="role"
           value={role}
           onChange={handleRoleChange}
           className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
           
         >
         <option value="" disabled>اختيار </option> {/* Placeholder option */}

           <option value="student">طالب</option>
           <option value="teacher">أستاذ</option>
         </select>
         </div>
         <div>
           <button type="submit" className="w-full bg-gray-dark text-white p-2 rounded-md hover:bg-green focus:outline-none focus:bg-black  focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors duration-300">تسجيل</button>
         </div>
       </form>
       {registrationStatus && <p>{registrationStatus}</p>}
       <div className="mt-4 text-sm text-gray text-center">
         <p> لديك حساب ؟ <a href="#" className="text-black font-semibold hover:underline">سجل دخولك</a>
         </p>
       </div>
     </div>
   </div>
     {/* <!-- Left Pane --> */}
     <div className="hidden lg:flex items-center justify-center flex-1 bg-white text-black">
     <div className="max-w-md w-full text-center">
     <img className="w-full" src="/human.png" alt="" />
     </div>
   </div>
 </div>
    </>
  )
}

