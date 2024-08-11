// store/authThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { registerSuccess, registerFailure,loginSuccess, loginFailure  } from './authSlice';

import axiosInstance from './axiosInstance';

export const register = createAsyncThunk(
    '/register',
    async (userData: { username: string; email: string; password: string; password2: string; role: string }, { dispatch }) => {
      try {
        const response = await axiosInstance.post('/register/', userData);
        const { message } = response.data;
        dispatch(registerSuccess({ message }));
      } catch (error) {
        dispatch(registerFailure({ message: 'Registration failed' }));
        console.error('Registration failed', error);
      }
    }
  );
  
  export const login = createAsyncThunk(
    'auth/login',
    async (userData: { username: string; password: string }, { dispatch }) => {
      try {
        const response = await axiosInstance.post('/auth/', userData);
        const { token, user } = response.data;
        console.log(response.data);
        
        localStorage.setItem('accessToken', token.access);
        dispatch(loginSuccess({ token: token.access, user }));
      } catch (error) {
        dispatch(loginFailure({ message: 'Login failed' }));
        console.error('Login failed', error);
      }
    }
  );
  
  