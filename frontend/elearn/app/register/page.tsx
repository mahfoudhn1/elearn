"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { register } from '../../store/authThunks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GoogleButton from 'react-google-button';
import { Eye, EyeOff, CheckCircle, User, Mail, Lock, Image } from 'lucide-react';
import Turnstile from 'react-turnstile';

const RegisterPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const registrationStatus = useSelector((state: RootState) => state.auth.registrationStatus);

  const [username, setUsername] = useState('');
  const [first_name, setFirst_name] = useState('');
  const [last_name, setLast_name] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const router = useRouter();

  const handleGoogleSuccess = () => {
    const state = "random";
    return router.push(
      `https://accounts.google.com/o/oauth2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        'https://riffaa.com/nextapi/api/auth/google/callback'
      )}&response_type=code&scope=profile email&state=${state}`
    );
  };

  const handleCaptchaSuccess = (token: string) => {
    setCaptchaToken(token);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setAvatar(event.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      alert("يرجى إكمال التحقق من CAPTCHA.");
      return;
    }

    if (password !== password2) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    const formData = new FormData();
    formData.append("username", username);
    formData.append("first_name", first_name);
    formData.append("last_name", last_name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("password2", password2);
    formData.append("captcha", captchaToken);
    if (avatar) {
      formData.append("avatar_file", avatar);
    }

    setLoading(true);

    const resultAction = await dispatch(register(formData));

    setLoading(false);

    if (register.fulfilled.match(resultAction)) {
      if (resultAction.payload.success) {
        setShowPopup(true);
      } else {
        setError(resultAction.payload.errorMessage || 'حدث خطأ أثناء التسجيل');
      }
    } else {
      setError('حدث خطأ غير متوقع');
    }
  };

  useEffect(() => {
    if (showPopup) {
      const timer = setTimeout(() => {
        setShowPopup(false);
        router.push('/login');
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [showPopup, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {/* Replace with your logo */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center">
            <img src="/logoblack.png" alt="logo riffaa" className='cursor-pointer w-24 h-24'/>

          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-grey-900">
          أنشئ حسابك
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          سجل واحصل على أفضل تجربة تعليمية مع المرونة والفعالية في إيصال المعلومة
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-md rounded-lg sm:px-10 ">
          <div className="mb-6">
            <GoogleButton 
              label="استمر بحساب جوجل"
              type="light" 
              onClick={handleGoogleSuccess}
              style={{ 
                width: '100%',
                borderRadius: '0.375rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.5)'
              }}
            />
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">أو</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} encType="multipart/form-data">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                اسم المستخدم <span className='text-sm text-orange-600'> ( يكون جزء واحد بدون فراغات) </span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  onChange={(e) => setUsername(e.target.value)}
                  className="focus:ring-orange-600 focus:border-orange-600 block w-full pr-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  الاسم
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  onChange={(e) => setFirst_name(e.target.value)}
                  className="mt-1 focus:ring-orange-600 focus:border-orange-600 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-right"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  اللقب
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  onChange={(e) => setLast_name(e.target.value)}
                  className="mt-1 focus:ring-orange-600 focus:border-orange-600 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-right"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-orange-600 focus:border-orange-600 block w-full pr-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-right"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                كلمة المرور
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-orange-600 focus:border-orange-600 block w-full pr-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="password2" className="block text-sm font-medium text-gray-700">
                تأكيد كلمة المرور
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password2"
                  name="password2"
                  type={showPassword2 ? 'text' : 'password'}
                  required
                  onChange={(e) => setPassword2(e.target.value)}
                  className="focus:ring-orange-600 focus:border-orange-600 block w-full pr-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2(!showPassword2)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center"
                >
                  {showPassword2 ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
                الصورة الشخصية (اختياري)
              </label>
              <div className="mt-1 flex items-center">
                <div className="relative rounded-md shadow-sm w-full">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Image className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="avatar"
                    name="avatar_file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="focus:ring-orange-600 focus:border-orange-600 block w-full pr-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border text-right"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="py-2">
              <Turnstile 
                sitekey="0x4AAAAAABCXUolhlT329THY" 
                onSuccess={handleCaptchaSuccess}
                theme="light"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-grey-900 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
              >
                {loading ? 'جاري إنشاء الحساب...' : 'تسجيل'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">لديك حساب بالفعل؟</span>
              </div>
            </div>

            <div className="mt-6">
              <Link 
                href="/login" 
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-grey-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showPopup && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-grey-900 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                  <CheckCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-grey-900">تم التسجيل بنجاح!</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك. سيتم توجيهك تلقائياً إلى صفحة تسجيل الدخول خلال ثوانٍ.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:text-sm"
                  onClick={() => {
                    setShowPopup(false);
                    router.push('/login');
                  }}
                >
                  الانتقال الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;