"use client";

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { register } from '../../store/authThunks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axiosInstance from '../../store/axiosInstance';
import GoogleButton from 'react-google-button';

import { signIn } from 'next-auth/react'
import { NextPage } from 'next'

const RegisterPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const registrationStatus = useSelector((state: RootState) => state.auth.registrationStatus);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [role, setRole] = useState('');

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const router = useRouter();

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(event.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resultAction = await dispatch(register({ username, email, password, password2, role }));

    if (register.fulfilled.match(resultAction)) {
      if (resultAction.payload.success) {
        router.push('/login');
      } else {
        console.error('Registration failed');
      }
    }
  };

  const handleGoogleSuccess = async (response: any) => {
    if (response.credential) {
        const access_token = response.credential;
        console.log(access_token);
        

          try {
            const userData = {access_token:access_token}
            console.log(userData);
            const response = await axiosInstance.post('/google-register/', userData);
            const data = await response.data;
            console.log(response);
            
            if (data.success) {
                console.log('Authentication successful', data);
                // Handle successful login here
            } else {
                console.error('Authentication failed', data);
            }
        } catch (error) {
            console.error('Error during authentication', error);
        }
  

    } else {
        console.error('No credential found');
    }
};


  const handleGoogleError = (error: any) => {
    console.error('Google login error', error);
  };

  return (
    // <GoogleOAuthProvider clientId={clientId}>
      <div className="flex md:px-10 md:py-10">
        {/* Right Pane */}
        <div className="w-full bg-white lg:w-1/2 flex items-center justify-center">
          <div className="max-w-md w-full p-6">
            <h1 className="text-3xl font-semibold mb-6 text-black text-center">سجل حسابك</h1>
            <h1 className="text-sm font-semibold mb-6 text-gray text-center">سجل و احصل على أفضل تجربة تعليم, مرونة و نجاعة في ايصال المعلومة</h1>
            <div className="mt-4 flex flex-col lg:flex-row items-center justify-between">
              <div className="w-full lg:w-1/2 mb-2 lg:mb-0">
                {/* <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    console.log('Login Failed');
                  }}
                /> */}
              <GoogleButton onClick={() => signIn('google')} />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray text-center">
              <p>أو قم بادخال معلوماتك</p>
            </div>
            <form method="POST" className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray">اسم المستخد</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 p-2 w-full border rounded-md focus:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray">البريد الالكتروني</label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 p-2 w-full border rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
                />
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
                <label className="block text-sm font-medium text-gray">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  id="password2"
                  name="password2"
                  onChange={(e) => setPassword2(e.target.value)}
                  className="mt-1 p-2 w-full border rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-gray-700">معلم او طالب</label>
                <select
                  id="role"
                  value={role}
                  onChange={handleRoleChange}
                  className="mt-1 p-2 w-full border bg-white rounded-md focus:border-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-colors duration-300"
                >
                  <option value="" disabled>اختيار</option>
                  <option value="student">طالب</option>
                  <option value="teacher">أستاذ</option>
                </select>
              </div>
              <div>
                <button type="submit" className="w-full bg-gray-dark text-white p-2 rounded-md hover:bg-green focus:outline-none focus:bg-black focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors duration-300">تسجيل</button>
              </div>
            </form>
            {registrationStatus && <p>{registrationStatus}</p>}
            <div className="mt-4 text-sm text-gray text-center">
              <p> لديك حساب؟
                <Link href="/login" className="text-black font-semibold hover:underline">
                  سجل دخولك
                </Link>
              </p>
            </div>
          </div>
        </div>
        {/* Left Pane */}
        <div className="hidden lg:flex items-center justify-center flex-1 bg-white text-black">
          <div className="max-w-md w-full text-center">
            <img className="w-full" src="/human.png" alt="" />
          </div>
        </div>
      </div>
    // </GoogleOAuthProvider>
  );
};

export default RegisterPage;
