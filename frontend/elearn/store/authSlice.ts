import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import updateUserRole from './authThunks'
import Cookies from 'js-cookie';


interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name:string;
  last_name:string;
  avatar_url: string;
  avatar : string;
  avatar_file:string;
  access_token : string;
}


interface AuthState {

    user: User | null;
    isAuthenticated: boolean;
    registrationStatus: string;
    loginStatus: string;
  }
  
  const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    registrationStatus: '',
    loginStatus: '',
  };
  
  const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
      loginSuccess(state, action: PayloadAction<{ user: User, message: string }>) {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.loginStatus = action.payload.message; 
        state.registrationStatus = '';  
        Cookies.set('user_role', action.payload.user.role || '', { expires: 7 });
      },
      logout(state) {
        state.user = null;
        state.isAuthenticated = false;
        state.loginStatus = '';  
        Cookies.remove('user_role');
        Cookies.remove('access_token');
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
    extraReducers: (builder) => {
      builder.addCase(updateUserRole.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload; // Update the user with the full object
      });
  
  
  }});

export const { loginSuccess,loginFailure, logout, registerSuccess, registerFailure } = authSlice.actions;
export default authSlice.reducer;
