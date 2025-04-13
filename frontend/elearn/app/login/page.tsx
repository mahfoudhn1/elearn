"use client"
import React, {useState} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { login } from '../../store/authThunks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GoogleButton from 'react-google-button';
import axios from 'axios';
import { loginSuccess } from '../../store/authSlice';
import Turnstile from "react-turnstile";


const Loginpage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const loginStatus = useSelector((state: RootState) => state.auth.loginStatus);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);

  const [err, setErr] = useState<string>()
  const router = useRouter()


  const handleCaptchaSuccess = (token: string) => {
    setCaptchaToken(token);
  };

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!captchaToken) {
      alert("Please complete the CAPTCHA.");
      return;
    }
  
    setLoading(true); 
  
    const resultAction = await dispatch(login({ username, password, captcha: captchaToken }));
  
    setLoading(false); 
  
    if (login.fulfilled.match(resultAction)) {
      if (resultAction.payload?.success) {
        const redirectTo = localStorage.getItem('redirectAfterLogin');
        if (redirectTo) {
          localStorage.removeItem('redirectAfterLogin');
          router.push(redirectTo);
        } else {
          router.push('/dashboard');
        }
      } else {
        setErr("اسم المستخدم او كلمة المرور غير صحيحة");
      }
    }
  };
  
  


const handleGoogleSuccess = () => {
  const state = "random"
  return router.push(`https://accounts.google.com/o/oauth2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent('https://riffaa.com/nextapi/api/auth/google/callback')}&response_type=code&scope=profile email&state=${state}`)
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
            className="w-full py-2 bg-gray-dark text-white font-semibold rounded-lg shadow-md hover:bg-green focus:outline-none focus:ring-2 focus:ring-gray-dark disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "جاري الدخول..." : "سجل الدخول"}
          </button>

            <Turnstile
              className='my-6'
              sitekey="0x4AAAAAABCXUolhlT329THY"
              onSuccess={handleCaptchaSuccess}
            />
          <div className=' mt-6  items-center text-center mx-auto ' >
          <GoogleButton 
          label='استخدم حساب جوجل'
          type="light" 
           onClick={handleGoogleSuccess} />

          </div>
        </form>
        {err && <p className='text-red-500'> {err} </p>}
      </div>
    </div>
  );
};

export default Loginpage;
