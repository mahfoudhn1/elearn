// store/authThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { registerSuccess, registerFailure,loginSuccess, loginFailure, logout  } from './authSlice';
import { AppDispatch } from './store';
import axiosClientInstance from '../app/lib/axiosInstance';

export const register = createAsyncThunk(
    '/register',
    async (userData: FormData, { dispatch }) => {
      try {
        const response = await axiosClientInstance.post('/register/', userData,{
          headers: {
            'Content-Type': 'multipart/form-data', 
          },
        });
        const { message } = response.data;
        dispatch(registerSuccess({ message }));
        return { success: true }; 
      } catch (error) {
        dispatch(registerFailure({ message: 'اسم المستخدم مستعمل من قبل' }));
        console.error('Registration failed', error);
        return { success: false }; 
      }
    }
  );
  const updateUserRole = createAsyncThunk(
    'auth/updateRole',
    async (role: string, { rejectWithValue }) => {
      try {
        const response = await axiosClientInstance.put('/users/me/', { role });
        return response.data; 
      } catch (error) {
        return rejectWithValue("No update made");
      }
    }
  );
  
  export default updateUserRole;

  
  export const login = createAsyncThunk(
    'auth/login',
    async (userData: { username: string; password: string, captcha:string }, { dispatch }) => {
      try {
        const response = await axiosClientInstance.post('/auth/', userData);
        const {  user } = response.data;
        
        const { message } = response.data
        dispatch(loginSuccess({user, message}));
        return { success: true }; 

      } catch (error) {
        dispatch(loginFailure({ message: 'Login failed' }));
        console.error('Login failed', error);
      }
    }
  );
  
export const LogoutThunk = createAsyncThunk(
  'auth/logout',
  async (dispatch:AppDispatch ) => {
    try {
      await axiosClientInstance.post('/logout/', {}, {
        withCredentials: true, 
      });
      
      document.cookie = 'access_token=; Max-Age=0; path=/;'; 
      document.cookie = 'refresh_token=; Max-Age=0; path=/;';
      dispatch(logout());
      
      // Optionally redirect the user
      // You can use history.push('/login') if you're using react-router
    } catch (error) {
      console.error('Error during logout:', error);
      // Optionally dispatch an error action
    }
  }
);
  