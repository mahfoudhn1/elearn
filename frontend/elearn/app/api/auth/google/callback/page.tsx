"use client"
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../../../../store/authSlice';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import axiosClientInstance from '../../../../lib/axiosInstance';

const GoogleCallback = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState({ loading: true, error: null });

  useEffect(() => {
    const code = searchParams.get('code');
    
    const exchangeCodeForTokens = async () => {
      if (!code) {
        setStatus({ 
          loading: false, 
          error: null 
        });
        return;
      }

      try {
        setStatus({ loading: true, error: null });
        
        const response = await axiosClientInstance.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/callback/google/`, 
          { code },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            
          }
        );

        if (response.data?.user) {
          dispatch(loginSuccess({ 
            user: response.data.user, 
            message: response.data.message || 'Login successful' 
          }));
          router.push('/dashboard');
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error:any) {
        console.error('Authentication error:', error);
        setStatus({ 
          loading: false, 
          error: error.response?.data?.error || 'Authentication failed. Please try again.' 
        });
        
  
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    exchangeCodeForTokens();
  }, [dispatch, router, searchParams]);

  if (status.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-4 p-6 bg-white rounded-lg shadow-md">
          <div className="text-center text-red-600">
            <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
            <p>{status.error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-4 p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            Processing Google Authentication
          </h2>
          <div className="animate-pulse flex justify-center">
            <div className="h-4 w-4 bg-blue-600 rounded-full mx-1"></div>
            <div className="h-4 w-4 bg-blue-600 rounded-full mx-1 animate-pulse delay-75"></div>
            <div className="h-4 w-4 bg-blue-600 rounded-full mx-1 animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;