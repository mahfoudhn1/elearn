"use client"
import { useEffect } from 'react';
import { NextPage } from 'next';

const SignIn: NextPage = () => {
  useEffect(() => {
    // Redirect user to Google's OAuth endpoint
    window.location.href = `https://accounts.google.com/o/oauth2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent('https://riffaa.com/nextapi/api/auth/callback/google')}&response_type=code&scope=profile email`;
  }, []);

  return <div>Redirecting to Google...</div>;
};

export default SignIn;
