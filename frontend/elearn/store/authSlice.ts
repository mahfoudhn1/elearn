import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from './axiosInstance'


interface AuthState {
    token: string | null;
    user: object | null;
    isAuthenticated: boolean;
    registrationStatus: string;
    loginStatus: string;
  }
  
  const initialState: AuthState = {
    token: null,
    user: null,
    isAuthenticated: false,
    registrationStatus: '',
    loginStatus: '',
  };
  
  const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
      loginSuccess(state, action: PayloadAction<{ token: string; user: object }>) {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      },
      logout(state) {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        localStorage.removeItem('accessToken'); // Clear token on logout
      },
      registerSuccess(state, action: PayloadAction<{ message: string }>) {
        state.registrationStatus = action.payload.message;
      },
      registerFailure(state, action: PayloadAction<{ message: string }>) {
        state.registrationStatus = action.payload.message;
      },
      loginFailure(state, action: PayloadAction<{ message: string }>) {
        state.loginStatus = action.payload.message;
      },
    
    },
  });

export const { loginSuccess,loginFailure, logout, registerSuccess, registerFailure } = authSlice.actions;
export default authSlice.reducer;
