import axios from 'axios';
import { cookies } from 'next/headers';

// Create axios instance with environment-aware configuration
const axiosSSRInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosSSRInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Only attempt refresh on 401 errors and if not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = cookies().get('refresh_token')?.value;
      
      if (!refreshToken) {
        console.error('No refresh token available');
        return Promise.reject(error);
      }

      try {
        // Use relative URL since baseURL is already configured
        const response = await axiosSSRInstance.post(
          'https://riffaa.com/nextapi/api/auth/refresh',
          { refreshToken },
          { withCredentials: true }
        );

        const { access_token, refresh_token } = response.data;
        
        if (access_token) {
          // Update the original request headers
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          
          // If you need to update the HTTP-only cookie, you'll need to handle this
          // via your Next.js API route response rather than directly here
          
          return axiosSSRInstance(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear invalid tokens
        cookies().delete('access_token');
        cookies().delete('refresh_token');
        
        // Optionally redirect to login (handle this in your Next.js middleware)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosSSRInstance;