import { cookies } from "next/headers";
import createAxiosInstance from "../lib/axiosInstance";


const axiosInstance = createAxiosInstance();
async function refreshAccessToken() {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;
  
    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }
  
    try {
      const response = await axiosInstance.post('/token/refresh/', null, {
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
        },
        withCredentials:true
      });
      const newAccessToken = response.data.access; // Assuming this is the structure
      
      
      document.cookie = `access_token=${newAccessToken}; path=/; HttpOnly;`;
  
      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token.');
    }
  }

export default refreshAccessToken