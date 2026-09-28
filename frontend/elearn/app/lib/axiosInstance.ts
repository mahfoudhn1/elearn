import axios from 'axios';

const axiosClientInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});


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
