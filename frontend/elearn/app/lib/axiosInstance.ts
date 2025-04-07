import axios from 'axios';

// Create axios instance with environment-aware configuration
const axiosClientInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
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
      const refreshToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('refresh_token='))
        ?.split('=')[1];

      if (!refreshToken) {
        console.error("Refresh token not found in cookies.");
        return Promise.reject(error);
      }

      try {
        const response = await axiosClientInstance.post(
          'token/refresh/',
          { refreshToken },
          {
            withCredentials: true,
          }
        );

        const { access_token, refresh_token } = response.data;
        const isProduction = process.env.NODE_ENV === 'production';

        if (access_token) {
          document.cookie = `access_token=${access_token}; path=/; max-age=${15 * 60}; ${
            isProduction ? 'secure;' : 'secure=false;'
          } samesite=lax`;
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        }

        if (refresh_token) {
          document.cookie = `refresh_token=${refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; ${
            isProduction ? 'secure;' : 'secure=false;'
          } samesite=lax`;
        }

        return axiosClientInstance(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClientInstance;