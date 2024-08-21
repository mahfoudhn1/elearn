// store/authThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { registerSuccess, registerFailure,loginSuccess, loginFailure, logout  } from './authSlice';

import axiosInstance from './axiosInstance';
import { AppDispatch } from './store';

export const register = createAsyncThunk(
    '/register',
    async (userData: { username: string; email: string; first_name: string, last_name: string, password: string; password2: string; role: string }, { dispatch }) => {
      try {
        const response = await axiosInstance.post('/register/', userData);
        const { message } = response.data;
        dispatch(registerSuccess({ message }));
        return { success: true }; // Return success status
      } catch (error) {
        dispatch(registerFailure({ message: 'Registration failed' }));
        console.error('Registration failed', error);
        return { success: false }; 
      }
    }
  );
  const updateUserRole = createAsyncThunk(
    'auth/updateRole',
    async (role: string, { rejectWithValue }) => {
      try {
        const response = await axiosInstance.put('/users/me/', { role });
        return response.data; // This should be the entire user object
      } catch (error) {
        return rejectWithValue("No update made");
      }
    }
  );
  
  export default updateUserRole;

  
  export const login = createAsyncThunk(
    'auth/login',
    async (userData: { username: string; password: string }, { dispatch }) => {
      try {
        const response = await axiosInstance.post('/auth/', userData);
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
      await axiosInstance.post('/logout/', {}, {
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
  