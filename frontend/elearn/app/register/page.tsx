"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { register } from '../../store/authThunks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GoogleButton from 'react-google-button';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
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
  const [showPopup, setShowPopup] = useState(false); // State for popup

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
        setShowPopup(true); // Show popup on success
      } else {
        setError(resultAction.payload.errorMessage || 'حدث خطأ أثناء التسجيل');
      }
    } else {
      setError('حدث خطأ غير متوقع');
    }
  };

  // Handle popup timeout and redirect
  useEffect(() => {
    if (showPopup) {
      const timer = setTimeout(() => {
        setShowPopup(false);
        router.push('/login');
      }, 10000); // 10 seconds

      return () => clearTimeout(timer); // Cleanup on unmount
    }
  }, [showPopup, router]);

  return (
    <div className="flex md:px-10 md:py-10">
      <div className="w-full bg-white lg:w-1/2 flex items-center justify-center">
        <div className="max-w-md w-full p-6">
          <h1 className="text-3xl font-semibold mb-6 text-black text-center">سجل حسابك</h1>
          <h1 className="text-sm font-semibold mb-6 text-gray text-center">
            سجل و احصل على أفضل تجربة تعليم, مرونة و نجاعة في ايصال المعلومة
          </h1>

          <GoogleButton label="استخدم حساب جوجل" type="light" onClick={handleGoogleSuccess} />

          <div className="mt-4 text-sm text-gray text-center">
            <p>أو قم بادخال معلوماتك</p>
          </div>

          <form method="POST" className="space-y-4" onSubmit={handleSubmit} encType="multipart/form-data">
            <div>
              <label className="block text-sm font-medium text-gray">اسم المستخدم</label>
              <input
                type="text"
                id="username"
                name="username"
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray">الاسم</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                onChange={(e) => setFirst_name(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray">اللقب</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                onChange={(e) => setLast_name(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray">البريد الالكتروني</label>
              <input
                type="email"
                id="email"
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 p-2 w-full border rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray">تأكيد كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword2 ? 'text' : 'password'}
                  id="password2"
                  name="password2"
                  onChange={(e) => setPassword2(e.target.value)}
                  className="mt-1 p-2 w-full border rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2(!showPassword2)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {showPassword2 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray">الصورة الشخصية</label>
              <input
                type="file"
                id="avatar"
                name="avatar_file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1 p-2 w-full border rounded-md"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div>
              <button
                type="submit"
                className="w-full bg-gray-dark text-white p-2 rounded-md hover:bg-green focus:outline-none transition-colors duration-300"
                disabled={loading}
              >
                {loading ? 'جاري التسجيل...' : 'تسجيل'}
              </button>
            </div>
            <Turnstile sitekey="0x4AAAAAABCXUolhlT329THY" onSuccess={handleCaptchaSuccess} />
          </form>

          {registrationStatus && <p>{registrationStatus}</p>}

          <div className="mt-4 text-sm text-gray text-center">
            <p>
              لديك حساب؟
              <Link href="/login" className="text-black font-semibold hover:underline">
                سجل دخولك
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-center flex-1 bg-white text-black">
        <div className="max-w-md w-full text-center">
          <img className="w-full" src="/human.png" alt="" />
        </div>
      </div>

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <CheckCircle className="text-green-500 w-16 h-16 mb-4" />
            <p className="text-lg font-semibold text-gray-800">
              تحقق من بريدك الإلكتروني وقم بتفعيل حسابك
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;