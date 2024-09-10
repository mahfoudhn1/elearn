"use client"
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../../../../store/authSlice';
import { useRouter , useSearchParams } from 'next/navigation';
import axios from 'axios';

const GoogleCallback = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
      
    const code = searchParams.get('code');

    const exchangeCodeForTokens = async () => {
      if (typeof code === 'string') {
        try {

          
          const response = await axios.post(`http://localhost:8000/api/auth/callback/google/`, 
            {code},
            {
              withCredentials: true,
            }
          )

          if (response) {
            const data = await response.data;
            
            dispatch(loginSuccess({ user: data.user, message: 'Login successful' }));
            router.push('/dashboard'); 
          } else {
            console.error('Failed to authenticate');
          }
        } catch (error) {
          console.error('Error during token exchange:', error);
        }
      }
    };

    exchangeCodeForTokens();
  }, [dispatch, router]);

  return (
    <div>
      <h1>Processing Google Authentication...</h1>
    </div>
  );
};

export default GoogleCallback;
