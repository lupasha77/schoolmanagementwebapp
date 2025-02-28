//src/utils/api/axios.ts

 
import axios, { AxiosError,   } from 'axios';
import { refreshToken, forceLogout, STORAGE_KEYS } from './authUtils';
 
interface ApiErrorResponse {
  // Define the shape of the error response data
  error: string;
  message: string;
  statusCode: number;
}



// Create an Axios instance
const api = axios.create({
  
  baseURL: 'http://localhost:5000/api', // Replace with your API base URL
  timeout: 10000, // Set a timeout for requests in milliseconds
  headers: {
    'Content-Type': 'application/json', // Set default content type
  },
});

// Optional: Add request interceptors (e.g., to add authentication headers)
api.interceptors.request.use(
  (config) => {
    // Add your authentication logic here
    const accessToken = localStorage.getItem('accessToken');
    //Console.log('Axios Request - Access Token:', accessToken);
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

// Optional: Add response interceptors (e.g., to handle token refresh)
// Optional: Add response interceptors (e.g., to handle token refresh)
api.interceptors.response.use(
  
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      console.warn('[Auth] 401 Unauthorized - Attempting token refresh.');
      
      const refreshed = await refreshToken();
      if (refreshed) {
        //Console.log('[Auth] Token refreshed successfully. Retrying request.');
        if (error.config) { // Check if config is defined
          error.config.headers.Authorization = `Bearer ${localStorage.getItem(STORAGE_KEYS.accessToken)}`;
          return api.request(error.config); // Retry the original request
        } else {
          console.error('Error config is undefined');
          return Promise.reject(error);
        }
      }

      //Console.log('[Auth] Token refresh failed. Logging out.');
      await forceLogout() 
    }
    return Promise.reject(error);
  }
);


export default api

 

