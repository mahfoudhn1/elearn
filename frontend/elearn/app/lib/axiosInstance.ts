import axios from 'axios';

const axiosClientInstance = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: true, 
});

axiosClientInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Prevent multiple retries
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axiosClientInstance.post(
          `http://localhost:8000/api/token/refresh/`,
          {}, 
          {
            withCredentials: true, 
          }
        );

        const { access_token, refresh_token } = response.data;

        if (access_token) {
          document.cookie = `access_token=${access_token}; path=/; max-age=${15 * 60}; secure=false; samesite=lax`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        }

        if (refresh_token) {
          document.cookie = `refresh_token=${refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; secure=false; samesite=lax`;
        }

        return axiosClientInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClientInstance;
