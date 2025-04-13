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

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('error');
      
      originalRequest._retry = true;

      const refreshToken = cookies().get('refresh_token')?.value;

      if (!refreshToken) {
        console.error('No refresh token available');
        return Promise.reject(error);
      }

      try {
        const response = await axiosSSRInstance.post(
          'http://localhost:3000/api/auth/refresh/', // Relative URL
          { refreshToken },
          { withCredentials: true }
        );

        const { access_token } = response.data;

        if (access_token) {
          axiosSSRInstance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          
          return axiosSSRInstance(originalRequest); // Retry the original request
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosSSRInstance;