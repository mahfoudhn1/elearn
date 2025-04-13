import axios from 'axios';

const axiosClientInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

// Utility function to delete a cookie by name
const deleteCookie = (name:any) => {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};

// Add request interceptor to inject access token
axiosClientInstance.interceptors.request.use(
  (config) => {
    const accessToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('access_token='))
      ?.split('=')[1];
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClientInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshResponse = await axiosClientInstance.post(
          '/token/refresh/',
          {},
          { withCredentials: true }
        );

        const { access_token, refresh_token } = refreshResponse.data;
        const isProduction = process.env.NODE_ENV === 'production';

        // Clear existing cookies before setting new ones
        deleteCookie('access_token');
        deleteCookie('refresh_token');

        // Update the original request with new access token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        return axiosClientInstance(originalRequest);
      } catch (refreshError) {
          if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname + window.location.search;
              console.log(currentPath);
              
              if (currentPath !== '/login') {
                localStorage.setItem('redirectAfterLogin', currentPath);
              }
            }
            window.location.href = '/login';
            return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClientInstance;