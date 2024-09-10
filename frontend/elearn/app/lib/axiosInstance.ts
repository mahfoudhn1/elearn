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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(`http://127.0.0.1:8000/api/token/refresh/`, {}, {
          withCredentials: true,
        });

        
        const newAccessToken = response.data.access_token;

        if (newAccessToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
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
