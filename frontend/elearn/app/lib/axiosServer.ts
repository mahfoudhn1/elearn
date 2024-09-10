import axios from 'axios';
import { cookies } from 'next/headers'; // This is only available on the server side

const axiosSSRInstance = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: true, 
});

axiosSSRInstance.interceptors.request.use(
  (config) => {
    const cookieStore = cookies();
    const authToken = cookieStore.get('access_token')?.value;

    if (authToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosSSRInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await axios.post(`http://localhost:8000/api/token/refresh/`, {}, {
          withCredentials: true,
        });

        return axiosSSRInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosSSRInstance;
