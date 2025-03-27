"use client"
import { useState, useEffect } from 'react';

import Link from 'next/link';
import axiosClientInstance from '../lib/axiosInstance';
import { useSearchParams } from 'next/navigation';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const [message, setMessage] = useState('Verifying your email...');
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage('No verification token provided');
      setIsLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await axiosClientInstance.post('/auth/verify-email/', {
          token
        });
        setIsSuccess(true);
        setMessage(response.data.message);
      } catch (error:any) {
        setMessage(error.response?.data?.error || 'Email verification failed');
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
        </div>

        <div className={`p-4 rounded-md ${isSuccess ? 'bg-green-200 text-green-800' : 'bg-red-300 text-red-800'}`}>
          <p className="text-center">{message}</p>
        </div>

        {isSuccess && (
          <div className="text-center">
            <Link href="/login">
              <a className="text-sm text-blue-600 hover:text-blue-500">
                Proceed to login
              </a>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}