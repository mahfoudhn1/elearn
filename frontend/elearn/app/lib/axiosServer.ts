// lib/axiosServer.ts
import axios from 'axios';
import { cookies } from 'next/headers';
import { API_BASE_URL } from './apiUrl';

export function createAxiosSSRInstance() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  const instance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        if (!refreshToken) {
          console.error('No refresh token available');
          return Promise.reject(error);
        }

        try {
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/token/refresh/`,
            { refreshToken },
            { withCredentials: true }
          );

          const { access_token: newAccessToken } = refreshResponse.data;
          if (newAccessToken) {
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
}
