import axios from 'axios';
import { cookies } from 'next/headers';
import { refreshToken } from './serverAction';

const axiosSSRInstance = axios.create({
  baseURL: 'http://localhost:8000/api', // Your backend API URL
  withCredentials: true,
});

axiosSSRInstance.interceptors.request.use(
  (config) => {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosSSRInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    const refreshToken = cookies().get('refresh_token')?.value

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axiosSSRInstance.post('http://localhost:3000/api/auth/refresh',{refreshToken}, {withCredentials:true})
        const {access_token, refresh_token} = response.data
        
        if(access_token){
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return axiosSSRInstance(originalRequest);

        }
        // Retry the original request
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Handle refresh failure (e.g., redirect to login)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
export default axiosSSRInstance;