import axios from 'axios';
import { cookies } from 'next/headers';

const axiosSSRInstance = axios.create({
  baseURL: `${process.env.BASE_API_URL}/api`, // Your backend API URL
  withCredentials: true,
});



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